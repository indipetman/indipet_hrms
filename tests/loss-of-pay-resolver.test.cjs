const assert = require("node:assert/strict");
const test = require("node:test");

const resolver = require("../loss-of-pay-resolver.cjs");

const employee = { employee_id: "EMP-1", employee_name: "Example Employee" };
const leaveRow = (overrides = {}) => ({
  row_id: "LR-LOP-1",
  pageKey: "leave-requests",
  employee_id: "EMP-1",
  status: "Pending",
  cells: ["LR-LOP-1", "Example Employee", "Loss of Pay", "08/08/2026", "Pending"],
  details: {
    request_id: "LR-LOP-1",
    employee_id: "EMP-1",
    employee_name: "Example Employee",
    leave_code: "LOP",
    leave_name: "Loss of Pay",
    start_date: "2026-08-08",
    end_date: "2026-08-08",
    leave_portion: "FULL_DAY",
    lifecycle_status: "PENDING_REVIEW",
    ...overrides
  }
});

test("pending LOP request creates a no-balance pending pay-treatment entry", () => {
  const result = resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [leaveRow()]
  }, { now: "2026-08-08T09:00:00.000Z" });
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].leave_code, "LOP");
  assert.equal(result.entries[0].available_days, 0);
  assert.equal(result.entries[0].pending_days, 1);
  assert.equal(result.entries[0].used_days, 0);
  assert.equal(result.entries[0].pay_treatment, "LOSS_OF_PAY");
  assert.equal(result.entries[0].workflow_status, "PENDING_REVIEW");
});

test("approved half-day LOP records 0.5 used units without deducting a leave balance", () => {
  const result = resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [leaveRow({ lifecycle_status: "APPROVED", leave_portion: "HALF_DAY" })]
  });
  assert.equal(result.entries[0].units, 0.5);
  assert.equal(result.entries[0].used_days, 0.5);
  assert.equal(result.entries[0].pending_days, 0);
  assert.equal(result.entries[0].available_days, 0);
  assert.equal(result.entries[0].workflow_status, "APPROVED");
});

test("approved final absence creates LOP but weekly-off and holiday assignments do not", () => {
  const attendance = {
    row_id: "ATT-1",
    pageKey: "attendance-list",
    status: "Absent",
    details: {
      record_id: "ATT-1",
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      work_date: "2026-08-08",
      final_status: "Absent",
      lifecycle_status: "APPROVED",
      roster_shift: "Morning Shift"
    }
  };
  assert.equal(resolver.reconcileEntries([], { employees: [employee], module_rows: [attendance] }).entries.length, 1);
  assert.equal(resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [{ ...attendance, details: { ...attendance.details, roster_shift: "Weekly Off" } }]
  }).entries.length, 0);
  assert.equal(resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [attendance],
    rosters: [{ weekly_offs: [{ employee_id: "EMP-1", date: "2026-08-08" }] }]
  }).entries.length, 0);
});

test("one employee/date can have only one active LOP even when two sources exist", () => {
  const attendance = {
    row_id: "ATT-1",
    pageKey: "attendance-list",
    details: {
      record_id: "ATT-1",
      employee_id: "EMP-1",
      work_date: "2026-08-08",
      final_status: "Absent",
      lifecycle_status: "APPROVED",
      roster_shift: "Morning Shift"
    }
  };
  const result = resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [attendance, leaveRow({ lifecycle_status: "APPROVED" })]
  });
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].source_type, "LEAVE_REQUEST");
  assert.equal(result.entries[0].source_id, "LR-LOP-1");
});

test("removing an ordinary source removes LOP, but a payroll-applied entry remains immutable", () => {
  const generated = resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [leaveRow({ lifecycle_status: "APPROVED" })]
  }).entries[0];
  assert.equal(resolver.reconcileEntries([generated], { employees: [employee], module_rows: [] }).entries.length, 0);
  const payrollApplied = {
    ...generated,
    workflow_status: "PAYROLL_APPLIED",
    status: "Payroll Applied",
    payroll_status: "APPLIED",
    payroll_period: "2026-08",
    payroll_applied_at: "2026-08-31T18:00:00.000Z"
  };
  const result = resolver.reconcileEntries([payrollApplied], { employees: [employee], module_rows: [] });
  assert.deepEqual(result.entries, [payrollApplied]);
  assert.equal(resolver.validateEntries({ employees: [employee], leave_ledger: result.entries }).ok, true);
});

test("validation rejects duplicate active LOP and invalid units", () => {
  const valid = resolver.reconcileEntries([], {
    employees: [employee],
    module_rows: [leaveRow({ lifecycle_status: "APPROVED" })]
  }).entries[0];
  const validation = resolver.validateEntries({
    employees: [employee],
    module_rows: [leaveRow({ lifecycle_status: "APPROVED" })],
    leave_ledger: [valid, { ...valid, ledger_id: "duplicate", units: 0.25 }]
  });
  assert.equal(validation.ok, false);
  assert.match(validation.blockers.map(item => item.detail).join(" "), /Duplicate LOP|0.5 or 1/);
});
