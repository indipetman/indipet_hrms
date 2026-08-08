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

test("LOP is registered, acknowledged and reloaded from the Excel leave ledger", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-lop-"));
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
  assert.ok(Array.isArray(base.leave_ledger));
  const requestId = "LR-LOP-EMP-1-2026-08-08";
  const snapshot = {
    ...base,
    employees: [{
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      status: "Active",
      record: { employee_id: "EMP-1", status: "Active" }
    }],
    module_rows: [{
      row_id: requestId,
      pageKey: "leave-requests",
      employee_id: "EMP-1",
      status: "Pending",
      cells: [requestId, "Example Employee", "Loss of Pay", "08/08/2026", "Approved"],
      details: {
        request_id: requestId,
        employee_id: "EMP-1",
        employee_name: "Example Employee",
        leave_code: "LOP",
        leave_name: "Loss of Pay",
        start_date: "2026-08-08",
        end_date: "2026-08-08",
        lifecycle_status: "PENDING_REVIEW",
        leave_portion: "FULL_DAY"
      }
    }]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  const savedBody = await saved.text();
  assert.equal(saved.status, 200, savedBody);
  const acknowledgement = JSON.parse(savedBody);
  assert.equal(acknowledgement.counts.leave_ledger, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.leave_ledger.length, 1);
  assert.equal(reloaded.leave_ledger[0].leave_code, "LOP");
  assert.equal(reloaded.leave_ledger[0].pay_treatment, "LOSS_OF_PAY");
  assert.equal(reloaded.leave_ledger[0].used_days, 0);
  assert.equal(reloaded.leave_ledger[0].pending_days, 1);
  assert.equal(reloaded.leave_ledger[0].available_days, 0);
  assert.equal(reloaded.leave_ledger[0].source_id, requestId);
  assert.equal(reloaded.leave_ledger[0].workflow_status, "PENDING_REVIEW");
});
