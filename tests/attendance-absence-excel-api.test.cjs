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

test("system-generated absence is acknowledged by Excel and reloads from both attendance stores", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-attendance-absence-"));
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
  const details = {
    record_id: "attendance-auto-absence-2026-08-07-EMP-1",
    employee_id: "EMP-1",
    work_date: "2026-08-07",
    status: "Absent",
    issue: "No Show",
    capture_method: "SYSTEM_AUTO_ABSENCE",
    lifecycle_status: "APPROVED",
    decision_status: "APPROVED"
  };
  const snapshot = {
    ...base,
    employees: [{
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      status: "Active",
      record: { employee_id: "EMP-1", status: "Active" }
    }],
    attendance: [{
      id: details.record_id,
      employee_id: "EMP-1",
      work_date: "2026-08-07",
      status: "Absent",
      issue: "No Show",
      source: "SYSTEM_AUTO_ABSENCE"
    }],
    module_rows: [{
      row_id: details.record_id,
      pageKey: "attendance-list",
      employee_id: "EMP-1",
      cells: ["07/08/2026", "Example Employee", "EMP-1", "Location", "Morning Shift", "", "", "0h 00m", "No Show", "Absent"],
      details
    }]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  assert.equal(saved.status, 200);
  const acknowledgement = await saved.json();
  assert.equal(acknowledgement.counts.attendance, 1);
  assert.equal(acknowledgement.counts.module_rows, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.attendance[0].source, "SYSTEM_AUTO_ABSENCE");
  assert.equal(reloaded.module_rows[0].details.capture_method, "SYSTEM_AUTO_ABSENCE");
  assert.equal(reloaded.module_rows[0].details.status, "Absent");
});
