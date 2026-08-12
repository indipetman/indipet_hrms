const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const resolver = require("../attendance-policy-resolver.cjs");
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

test("attendance Full Coverage ownership reloads from Excel and remains Tenant and Entity isolated", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-attendance-policy-ownership-"));
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

  const policy = {
    tenant_id: "TEN-INDIPET",
    policy_id: "ATP-1",
    entity_id: "ENT-1",
    policy_code: "ATP0001",
    policy_name: "Universal Attendance Policy",
    status: "Active",
    version: 1,
    rules: {
      late_arrival_grace_minutes: 10,
      early_exit_grace_minutes: 5,
      minimum_half_day_minutes: 300,
      overtime_threshold_minutes: 30
    }
  };
  const assignment = {
    tenant_id: "TEN-INDIPET",
    assignment_id: "APA-1",
    policy_id: "ATP-1",
    entity_id: "ENT-1",
    assignment_mode: "INCLUDE",
    target_type: "ENTITY",
    target_key: "FULL_COVERAGE",
    target_label: "Full Coverage"
  };
  const reconciliation = resolver.reconcileApprovedFinalStatus({
    reviewStatus: "APPROVED",
    finalStatus: "Pending Configuration",
    assessment: { dayStatus: "Present", requiresReview: false, autoApprovalEligible: true }
  });
  const attendanceRow = {
    tenant_id: "TEN-INDIPET",
    row_id: "ATT-1",
    pageKey: "attendance-list",
    entity_id: "ENT-1",
    employee_id: "EMP-1",
    status: reconciliation.finalStatus,
    cells: ["01/06/2026", "Example Employee", "EMP-1", "Kolkata HQ", "Standard Shift", "10:03 AM", "07:03 PM", "9h 00m", "None", reconciliation.finalStatus],
    details: {
      employee_id: "EMP-1",
      entity_id: "ENT-1",
      work_date: "2026-06-01",
      review_status: "APPROVED",
      final_status: reconciliation.finalStatus,
      calculated_day_status: "Present",
      historical_status_reconciliation_reason: "ATTENDANCE_CONFIGURATION_RESOLVED",
      review_history: [{
        action: "RECONCILED_APPROVED_FINAL_STATUS",
        from_status: reconciliation.previousStatus,
        to_status: reconciliation.finalStatus
      }]
    }
  };

  const base = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify({
      ...base,
      attendance_policies: [policy],
      attendance_policy_assignments: [assignment],
      module_rows: [attendanceRow]
    })
  });
  const acknowledgement = await saved.json();
  assert.equal(saved.status, 200, JSON.stringify(acknowledgement));
  assert.equal(acknowledgement.counts.attendance_policies, 1);
  assert.equal(acknowledgement.counts.attendance_policy_assignments, 1);
  assert.equal(acknowledgement.counts.module_rows, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.attendance_policies[0].tenant_id, "TEN-INDIPET");
  assert.equal(reloaded.attendance_policies[0].entity_id, "ENT-1");
  assert.equal(reloaded.attendance_policy_assignments[0].tenant_id, "TEN-INDIPET");
  assert.equal(reloaded.attendance_policy_assignments[0].entity_id, "ENT-1");
  assert.equal(reloaded.module_rows[0].details.final_status, "Present");
  assert.equal(reloaded.module_rows[0].details.historical_status_reconciliation_reason, "ATTENDANCE_CONFIGURATION_RESOLVED");
  assert.equal(reloaded.module_rows[0].details.review_history[0].action, "RECONCILED_APPROVED_FINAL_STATUS");

  const employee = {
    employeeId: "EMP-1",
    tenantId: "TEN-INDIPET",
    organizationId: "ENT-1",
    entityId: "ENT-1",
    locationValues: ["LOC-1"]
  };
  const resolution = resolver.resolvePolicy({
    policies: reloaded.attendance_policies,
    assignments: reloaded.attendance_policy_assignments,
    employee
  });
  assert.equal(resolution.policy?.policy_id, "ATP-1");
  assert.equal(resolver.resolvePolicy({
    policies: reloaded.attendance_policies,
    assignments: reloaded.attendance_policy_assignments,
    employee: { ...employee, tenantId: "TEN-OTHER" }
  }).policy, null);
  assert.equal(resolver.resolvePolicy({
    policies: reloaded.attendance_policies,
    assignments: reloaded.attendance_policy_assignments,
    employee: { ...employee, entityId: "ENT-OTHER", organizationId: "ENT-OTHER" }
  }).policy, null);
});
