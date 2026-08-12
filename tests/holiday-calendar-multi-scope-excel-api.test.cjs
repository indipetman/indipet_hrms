const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");
const node = process.execPath;

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
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error("isolated HRMS mock server did not start");
}

async function startIsolatedServer(t, workbook) {
  const port = await freePort();
  const child = spawn(node, [path.join(root, "server.mjs")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HRMS_DB_PATH: workbook, HRMS_REQUIRE_ERP_CORE: "0" },
    stdio: "ignore"
  });
  t.after(() => child.kill());
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForHealth(baseUrl);
  return baseUrl;
}

test("Holiday Calendar multi-scope rows are acknowledged by Excel and reload as arrays", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-holiday-multi-scope-"));
  const workbookPath = path.join(temp, "hrms.xlsx");
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const baseUrl = await startIsolatedServer(t, workbookPath);

  const base = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const snapshot = {
    ...base,
    holiday_calendar: [{
      holiday_id: "HOL-MULTI-1",
      organization_id: "ENTITY-1",
      holiday_date: "2026-08-15",
      holiday_name: "Multi Location Holiday",
      holiday_type: "COMPANY",
      scope_type: "LOCATION",
      scope_key: "LOC-1",
      scope_label: "Kolkata HQ",
      scope_keys: ["LOC-1", "LOC-2"],
      scope_labels: ["Kolkata HQ", "Salt Lake Office"],
      store_closed: true,
      co_eligible: false,
      calendar_year: 2026,
      status: "Active"
    }]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  assert.equal(saved.status, 200);
  const acknowledgement = await saved.json();
  assert.equal(acknowledgement.counts.holiday_calendar, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.deepEqual(reloaded.holiday_calendar[0].scope_keys, ["LOC-1", "LOC-2"]);
  assert.deepEqual(reloaded.holiday_calendar[0].scope_labels, ["Kolkata HQ", "Salt Lake Office"]);
  assert.equal(reloaded.holiday_calendar[0].scope_key, "LOC-1");

  const workbook = XLSX.readFile(workbookPath);
  const headers = XLSX.utils.sheet_to_json(workbook.Sheets.holiday_calendar, { header: 1, defval: "" })[0];
  assert.ok(headers.includes("scope_keys"));
  assert.ok(headers.includes("scope_labels"));
  const row = XLSX.utils.sheet_to_json(workbook.Sheets.holiday_calendar, { defval: "" })[0];
  assert.equal(row.scope_keys, '["LOC-1","LOC-2"]');
});

test("legacy Holiday Calendar rows migrate without data loss and create a recoverable backup", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-holiday-scope-migration-"));
  const workbookPath = path.join(temp, "hrms.xlsx");
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));

  const legacyHeaders = [
    "tenant_id", "holiday_id", "organization_id", "holiday_date", "holiday_name", "holiday_type",
    "scope_type", "scope_key", "scope_label", "store_closed", "co_eligible", "calendar_year", "status", "created_at", "updated_at"
  ];
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([{
    tenant_id: "TEN-INDIPET",
    holiday_id: "HOL-LEGACY-1",
    organization_id: "ENTITY-1",
    holiday_date: "2026-01-01",
    holiday_name: "Legacy Holiday",
    holiday_type: "NATIONAL",
    scope_type: "LOCATION",
    scope_key: "LOC-LEGACY",
    scope_label: "Legacy Office",
    store_closed: "TRUE",
    co_eligible: "FALSE",
    calendar_year: 2026,
    status: "Active"
  }], { header: legacyHeaders });
  XLSX.utils.book_append_sheet(workbook, sheet, "holiday_calendar");
  XLSX.writeFile(workbook, workbookPath);

  const baseUrl = await startIsolatedServer(t, workbookPath);
  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const legacy = reloaded.holiday_calendar.find(record => record.holiday_id === "HOL-LEGACY-1");
  assert.ok(legacy);
  assert.deepEqual(legacy.scope_keys, ["LOC-LEGACY"]);
  assert.deepEqual(legacy.scope_labels, ["Legacy Office"]);
  assert.ok(fs.readdirSync(temp).some(name => name.startsWith("hrms_mock_database.pre-holiday-multi-scope-") && name.endsWith(".xlsx")));
});
