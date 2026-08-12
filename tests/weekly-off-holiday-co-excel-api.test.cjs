const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const weeklyOffResolver = require("../weekly-off-holiday-resolver.cjs");
const coResolver = require("../leave-ledger-co-resolver.cjs");
const root = path.resolve(__dirname, "..");

const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error("isolated HRMS mock server did not start");
}

test("weekly-off holiday CO is acknowledged with its roster, holiday and employee links and reloads from Excel", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-weekly-off-holiday-co-"));
  const workbook = path.join(temp, "hrms.xlsx");
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, "server.mjs")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HRMS_DB_PATH: workbook, HRMS_REQUIRE_ERP_CORE: "0" },
    stdio: "ignore"
  });
  t.after(() => {
    child.kill();
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForHealth(baseUrl);

  const location = {
    id: "LOC-1",
    parentCode: "ENT-1",
    name: "Kolkata HQ",
    operatingHoursRecords: [{ dayOfWeek: 7, isOpen: false }]
  };
  const employee = {
    employee_id: "EMP-1",
    employee_name: "Ayan",
    organization_id: "ENT-1",
    location_id: "LOC-1",
    status: "Active"
  };
  const roster = {
    roster_id: "RST-JUNE",
    location_id: "LOC-1",
    period: "01/06/2026 - 30/06/2026",
    status: "Published",
    weekly_offs: []
  };
  const holiday = {
    holiday_id: "HOL-21-JUNE",
    organization_id: "ENT-1",
    holiday_date: "2026-06-21",
    holiday_name: "Sunday Holiday",
    holiday_type: "COMPANY",
    scope_type: "FULL_COVERAGE",
    scope_key: "FULL_COVERAGE",
    scope_label: "Full Coverage",
    scope_keys: ["FULL_COVERAGE"],
    scope_labels: ["Full Coverage"],
    store_closed: false,
    co_eligible: false,
    calendar_year: 2026,
    status: "Active"
  };
  const candidates = weeklyOffResolver.resolveCandidates({
    rosters: [roster], locations: [location], employees: [employee], holidays: [holiday]
  });
  const credit = coResolver.reconcileEntries([], candidates).entries;
  assert.equal(credit.length, 1);

  const base = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify({
      ...base,
      employees: [{ employee_id: "EMP-1", employee_name: "Ayan", location: "Kolkata HQ", status: "Active", record: employee }],
      rosters: [roster],
      holiday_calendar: [holiday],
      leave_ledger: credit
    })
  });
  const acknowledgement = await saved.json();
  assert.equal(saved.status, 200, JSON.stringify(acknowledgement));
  assert.equal(acknowledgement.counts.rosters, 1);
  assert.equal(acknowledgement.counts.holiday_calendar, 1);
  assert.equal(acknowledgement.counts.leave_ledger, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.leave_ledger[0].employee_id, "EMP-1");
  assert.equal(reloaded.leave_ledger[0].holiday_id, "HOL-21-JUNE");
  assert.equal(reloaded.leave_ledger[0].source_id, "RST-JUNE");
  assert.equal(reloaded.leave_ledger[0].source_type, "WEEKLY_OFF_HOLIDAY");
  assert.equal(reloaded.leave_ledger[0].available_days, 1);
  assert.match(reloaded.leave_ledger[0].history[0].detail, /organization weekly closed day/);
});
