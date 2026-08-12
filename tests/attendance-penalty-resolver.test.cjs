const test = require("node:test");
const assert = require("node:assert/strict");

const Resolver = require("../attendance-penalty-resolver.cjs");

function attendanceRow(id, date, incident = "Late Arrival", decision = "APPROVED") {
  return {
    row_id: id,
    pageKey: "attendance-list",
    cells: [date, "Test Employee", "EMP001", "Main Store"],
    details: {
      record_id: id,
      employee_id: "EMP001",
      employee_name: "Test Employee",
      entity_id: "ENT001",
      location_id: "LOC001",
      work_date: date,
      applied_policy_id: "ATP001",
      lifecycle_status: decision,
      calculated_timing_incidents: [incident],
      final_status: "Present"
    }
  };
}

function snapshot(overrides = {}) {
  return {
    employees: [{ employee_id: "EMP001" }],
    attendance_policies: [{ policy_id: "ATP001", status: "Active" }],
    attendance_penalty_rules: [{
      rule_id: "APR001",
      policy_id: "ATP001",
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
    attendance_incident_counters: [],
    attendance_penalty_transactions: [],
    attendance_penalty_audit: [],
    in_app_notifications: [],
    attendance: [],
    module_rows: [
      attendanceRow("ATT001", "2026-08-01"),
      attendanceRow("ATT002", "2026-08-05"),
      attendanceRow("ATT003", "2026-08-08")
    ],
    leave_ledger: [{
      ledger_id: "leave-ledger-balance-EMP001-cl",
      employee_id: "EMP001",
      leave_code: "CL",
      available_days: 4
    }],
    ...overrides
  };
}

test("three finalized late arrivals create one CL deduction and a traceable counter", () => {
  const result = Resolver.reconcile(snapshot(), { now: "2026-08-08T10:00:00.000Z" });
  assert.equal(result.snapshot.attendance_penalty_transactions.length, 1);
  assert.equal(result.snapshot.attendance_penalty_transactions[0].consequence_type, "LEAVE_DEDUCTION");
  assert.equal(result.snapshot.attendance_penalty_transactions[0].leave_code, "CL");
  assert.equal(result.snapshot.attendance_penalty_transactions[0].units, 1);
  assert.deepEqual(result.snapshot.attendance_penalty_transactions[0].source_attendance_ids, ["ATT001", "ATT002", "ATT003"]);
  assert.equal(result.snapshot.attendance_incident_counters[0].occurrence_count, 3);
  assert.equal(result.snapshot.attendance_incident_counters[0].consumed_count, 3);
  assert.equal(Resolver.leaveDeductionUnits(result.snapshot.attendance_penalty_transactions, "EMP001", "CL"), 1);
});

test("reconciliation is idempotent and a fourth incident does not duplicate the first consequence", () => {
  const first = Resolver.reconcile(snapshot(), { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  first.module_rows.push(attendanceRow("ATT004", "2026-08-09"));
  const second = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  const third = Resolver.reconcile(second, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  assert.equal(second.attendance_penalty_transactions.length, 1);
  assert.deepEqual(third.attendance_penalty_transactions, second.attendance_penalty_transactions);
  assert.deepEqual(third.attendance_penalty_audit, second.attendance_penalty_audit);
});

test("insufficient leave balance follows the configured Loss of Pay fallback", () => {
  const input = snapshot({
    leave_ledger: [{
      ledger_id: "leave-ledger-balance-EMP001-cl",
      employee_id: "EMP001",
      leave_code: "CL",
      available_days: 0
    }]
  });
  const result = Resolver.reconcile(input, { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  assert.equal(result.attendance_penalty_transactions[0].consequence_type, "LOSS_OF_PAY");
  assert.equal(result.attendance_penalty_transactions[0].workflow_status, "APPLIED");
  assert.equal(Resolver.lossOfPayCandidates(result.attendance_penalty_transactions)[0].units, 1);
});

test("a rolling-day rule uses a true sliding window instead of fixed batches", () => {
  const input = snapshot({
    module_rows: [
      attendanceRow("ATT001", "2026-01-01"),
      attendanceRow("ATT002", "2026-01-20"),
      attendanceRow("ATT003", "2026-02-10"),
      attendanceRow("ATT004", "2026-02-15")
    ]
  });
  input.attendance_penalty_rules[0].counting_period_type = "ROLLING_DAYS";
  input.attendance_penalty_rules[0].counting_period_value = 30;
  const result = Resolver.reconcile(input, { now: "2026-02-15T10:00:00.000Z" }).snapshot;
  assert.equal(result.attendance_penalty_transactions.length, 1);
  assert.deepEqual(result.attendance_penalty_transactions[0].source_attendance_ids, ["ATT002", "ATT003", "ATT004"]);
});

test("Skip remains a final skipped consequence when leave balance is insufficient", () => {
  const input = snapshot({
    leave_ledger: [{
      ledger_id: "leave-ledger-balance-EMP001-cl",
      employee_id: "EMP001",
      leave_code: "CL",
      available_days: 0
    }]
  });
  input.attendance_penalty_rules[0].insufficient_balance_action = "SKIP";
  const result = Resolver.reconcile(input, { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  assert.equal(result.attendance_penalty_transactions[0].consequence_type, "SKIP");
  assert.equal(result.attendance_penalty_transactions[0].workflow_status, "SKIPPED");
  assert.equal(Resolver.lossOfPayCandidates(result.attendance_penalty_transactions).length, 0);
});

test("rejecting a source attendance reverses an unapplied-payroll consequence", () => {
  const first = Resolver.reconcile(snapshot(), { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  first.module_rows[2] = attendanceRow("ATT003", "2026-08-08", "Late Arrival", "REJECTED");
  const second = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  assert.equal(second.attendance_penalty_transactions[0].workflow_status, "REVERSED");
  assert.equal(Resolver.leaveDeductionUnits(second.attendance_penalty_transactions, "EMP001", "CL"), 0);
});

test("a reversed consequence is reactivated without duplicating its deterministic transaction ID", () => {
  const first = Resolver.reconcile(snapshot(), { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  const transactionId = first.attendance_penalty_transactions[0].transaction_id;
  first.module_rows[2] = attendanceRow("ATT003", "2026-08-08", "Late Arrival", "REJECTED");
  const reversed = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  assert.equal(reversed.attendance_penalty_transactions[0].workflow_status, "REVERSED");
  reversed.module_rows[2] = attendanceRow("ATT003", "2026-08-08", "Late Arrival", "APPROVED");
  const reactivated = Resolver.reconcile(reversed, { now: "2026-08-10T10:00:00.000Z" }).snapshot;
  assert.equal(reactivated.attendance_penalty_transactions.length, 1);
  assert.equal(reactivated.attendance_penalty_transactions[0].transaction_id, transactionId);
  assert.equal(reactivated.attendance_penalty_transactions[0].workflow_status, "APPLIED");
  assert.equal(reactivated.attendance_penalty_audit.at(-1).action, "REACTIVATED");
  assert.equal(Resolver.validateSnapshot(reactivated).ok, true);
});

test("moving attendance to another policy reverses the former policy consequence", () => {
  const first = Resolver.reconcile(snapshot(), { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  first.attendance_policies.push({ policy_id: "ATP002", status: "Active" });
  first.module_rows.forEach(row => { row.details.applied_policy_id = "ATP002"; });
  const second = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  assert.equal(second.attendance_penalty_transactions[0].workflow_status, "REVERSED");
  assert.equal(Resolver.leaveDeductionUnits(second.attendance_penalty_transactions, "EMP001", "CL"), 0);
});

test("a payroll-applied consequence becomes reversal pending instead of being silently changed", () => {
  const first = Resolver.reconcile(snapshot(), { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  first.attendance_penalty_transactions[0].workflow_status = "PAYROLL_APPLIED";
  first.module_rows[2] = attendanceRow("ATT003", "2026-08-08", "Late Arrival", "REJECTED");
  const second = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  assert.equal(second.attendance_penalty_transactions[0].workflow_status, "REVERSAL_PENDING");
});

test("integrity validation rejects a leave-deduction rule without a leave type", () => {
  const invalid = snapshot();
  invalid.attendance_penalty_rules[0].leave_code = "";
  const validation = Resolver.validateSnapshot(invalid);
  assert.equal(validation.ok, false);
  assert.match(validation.blockers.map(item => item.detail).join(" "), /requires a leave type/i);
});

test("Warning Only creates one unread in-app notification without deducting leave or pay", () => {
  const input = snapshot();
  input.attendance_penalty_rules[0].consequence_type = "WARNING";
  input.attendance_penalty_rules[0].leave_code = "";
  const result = Resolver.reconcile(input, { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  assert.equal(result.attendance_penalty_transactions[0].consequence_type, "WARNING");
  assert.equal(Resolver.leaveDeductionUnits(result.attendance_penalty_transactions, "EMP001", "CL"), 0);
  assert.equal(Resolver.lossOfPayCandidates(result.attendance_penalty_transactions).length, 0);
  assert.equal(result.in_app_notifications.length, 1);
  assert.equal(result.in_app_notifications[0].source_id, result.attendance_penalty_transactions[0].transaction_id);
  assert.equal(result.in_app_notifications[0].recipient_employee_id, "EMP001");
  assert.equal(result.in_app_notifications[0].status, "ACTIVE");
  assert.equal(result.in_app_notifications[0].read_status, "UNREAD");
  assert.match(result.in_app_notifications[0].message, /3 Late Arrival incidents/);
  assert.match(result.in_app_notifications[0].message, /No leave or pay deduction was applied/);
});

test("Warning Only notification reconciliation is idempotent and preserves read state", () => {
  const input = snapshot();
  input.attendance_penalty_rules[0].consequence_type = "WARNING";
  input.attendance_penalty_rules[0].leave_code = "";
  const first = Resolver.reconcile(input, { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  first.in_app_notifications[0].read_status = "READ";
  first.in_app_notifications[0].read_at = "2026-08-08T11:00:00.000Z";
  first.in_app_notifications[0].updated_at = "2026-08-08T11:00:00.000Z";
  const second = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  const third = Resolver.reconcile(second, { now: "2026-08-10T10:00:00.000Z" }).snapshot;
  assert.equal(second.in_app_notifications.length, 1);
  assert.equal(second.in_app_notifications[0].read_status, "READ");
  assert.equal(second.in_app_notifications[0].read_at, "2026-08-08T11:00:00.000Z");
  assert.deepEqual(third.in_app_notifications, second.in_app_notifications);
});

test("reversing a Warning Only transaction resolves its notification", () => {
  const input = snapshot();
  input.attendance_penalty_rules[0].consequence_type = "WARNING";
  input.attendance_penalty_rules[0].leave_code = "";
  const first = Resolver.reconcile(input, { now: "2026-08-08T10:00:00.000Z" }).snapshot;
  first.module_rows[2] = attendanceRow("ATT003", "2026-08-08", "Late Arrival", "REJECTED");
  const second = Resolver.reconcile(first, { now: "2026-08-09T10:00:00.000Z" }).snapshot;
  assert.equal(second.attendance_penalty_transactions[0].workflow_status, "REVERSED");
  assert.equal(second.in_app_notifications.length, 1);
  assert.equal(second.in_app_notifications[0].status, "RESOLVED");
  assert.equal(second.in_app_notifications[0].resolved_at, "2026-08-09T10:00:00.000Z");
});
