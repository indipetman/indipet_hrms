const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

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
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error("isolated HRMS mock server did not start");
}

function request(rowId, employeeId, portion) {
  return {
    row_id: rowId,
    pageKey: "leave-requests",
    status: "Approved",
    cells: [rowId, employeeId, "Casual Leave", "06/08/2026", "Approved"],
    details: {
      request_id: rowId,
      employee_id: employeeId,
      start_date: "2026-08-06",
      end_date: "2026-08-06",
      leave_portion: portion,
      decision_status: "Approved"
    }
  };
}

test("Excel API acknowledges valid half-day capacity, reloads it, and rejects an over-cap save", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-leave-cap-"));
  const workbook = path.join(temp, "hrms.xlsx");
  const port = await freePort();
  const child = spawn(node, [path.join(root, "server.mjs")], {
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

  const base = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const snapshot = {
    ...base,
    employees: [
      { employee_id: "E1", employee_name: "One", status: "Active", record: { employee_id: "E1", location_id: "L1", default_shift_id: "S1" } },
      { employee_id: "E2", employee_name: "Two", status: "Active", record: { employee_id: "E2", location_id: "L1", default_shift_id: "S1" } }
    ],
    shift_policies: [{
      policy_id: "S1", location_id: "L1", policy_name: "Opening", policy_status: "Active",
      sanctioned_strength: 2, max_leave_per_day: 1
    }],
    module_rows: [request("R1", "E1", "FIRST_HALF"), request("R2", "E2", "SECOND_HALF")]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  assert.equal(saved.status, 200);
  const acknowledgement = await saved.json();
  assert.equal(acknowledgement.counts.module_rows, 2);
  assert.equal(acknowledgement.counts.shift_policies, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.module_rows.length, 2);
  assert.equal(reloaded.shift_policies[0].max_leave_per_day, 1);

  reloaded.module_rows[1].details.leave_portion = "FIRST_HALF";
  const rejected = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": reloaded._server_revision },
    body: JSON.stringify(reloaded)
  });
  assert.equal(rejected.status, 409);
  const rejection = await rejected.json();
  assert.match(rejection.error, /leave limit/i);
  assert.equal(rejection.blockers[0].approved_count, 2);
});
