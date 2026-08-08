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

function attendanceRow(id, date) {
  return {
    row_id: id,
    pageKey: "attendance-list",
    employee_id: "EMP-1",
    entity_id: "ENT-1",
    location_id: "LOC-1",
    cells: [date, "Example Employee", "EMP-1", "Example Location", "Morning Shift", "Morning Shift", "09:15 AM", "06:00 PM", "8h 45m", "Late Arrival", "Present", "Approved"],
    details: {
      record_id: id,
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      entity_id: "ENT-1",
      location_id: "LOC-1",
      work_date: date,
      applied_policy_id: "ATP-1",
      lifecycle_status: "APPROVED",
      calculated_timing_incidents: ["Late Arrival"],
      final_status: "Present"
    }
  };
}

test("attendance penalty rules, counters, transactions and audit reload from Excel", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-attendance-penalty-"));
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
  for (const table of ["attendance_penalty_rules", "attendance_incident_counters", "attendance_penalty_transactions", "attendance_penalty_audit"]) {
    assert.ok(Array.isArray(base[table]), `${table} should be registered`);
  }
  const snapshot = {
    ...base,
    employees: [{
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      status: "Active",
      record: { employee_id: "EMP-1", status: "Active" }
    }],
    attendance_policies: [{
      policy_id: "ATP-1",
      entity_id: "ENT-1",
      policy_code: "ATP0001",
      policy_name: "Standard Attendance",
      status: "Active"
    }],
    attendance_penalty_rules: [{
      rule_id: "APR-1",
      policy_id: "ATP-1",
      entity_id: "ENT-1",
      rule_name: "Three late arrivals",
      incident_code: "LATE_ARRIVAL",
      occurrence_threshold: 3,
      counting_period_type: "CALENDAR_MONTH",
      counting_period_value: 30,
      consequence_type: "LEAVE_DEDUCTION",
      leave_code: "CL",
      consequence_units: 1,
      insufficient_balance_action: "LOSS_OF_PAY",
      priority: 10,
      status: "Active"
    }],
    leave_ledger: [{
      ledger_id: "leave-ledger-balance-EMP-1-cl",
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      leave_code: "CL",
      leave_name: "Casual Leave",
      available_days: 4,
      status: "Active"
    }],
    module_rows: [
      attendanceRow("ATT-1", "2026-08-01"),
      attendanceRow("ATT-2", "2026-08-05"),
      attendanceRow("ATT-3", "2026-08-08")
    ]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  const body = await saved.text();
  assert.equal(saved.status, 200, body);
  const acknowledgement = JSON.parse(body);
  assert.equal(acknowledgement.counts.attendance_penalty_rules, 1);
  assert.equal(acknowledgement.counts.attendance_incident_counters, 1);
  assert.equal(acknowledgement.counts.attendance_penalty_transactions, 1);
  assert.equal(acknowledgement.counts.attendance_penalty_audit, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.attendance_penalty_rules[0].rule_name, "Three late arrivals");
  assert.equal(reloaded.attendance_incident_counters[0].occurrence_count, 3);
  assert.deepEqual(reloaded.attendance_incident_counters[0].qualifying_attendance_ids, ["ATT-1", "ATT-2", "ATT-3"]);
  assert.equal(reloaded.attendance_penalty_transactions[0].consequence_type, "LEAVE_DEDUCTION");
  assert.deepEqual(reloaded.attendance_penalty_transactions[0].source_attendance_ids, ["ATT-1", "ATT-2", "ATT-3"]);
  assert.equal(reloaded.attendance_penalty_audit[0].action, "CREATED");
});
