const test = require("node:test");
const assert = require("node:assert/strict");
const integrity = require("../hrms-financial-year-integrity.cjs");

const organization = {
  financial_years: [
    { financial_year_id: "FY-2025-26", start_date: "2025-04-01", end_date: "2026-03-31", status: "Open", is_current: "No" },
    { financial_year_id: "FY-2026-27", start_date: "2026-04-01", end_date: "2027-03-31", status: "Open", is_current: "Yes" }
  ]
};

test("HRMS date-bound roots receive the ERP Core Financial Year ID", () => {
  const snapshot = {
    attendance: [{ id: "ATT-1", work_date: "2026-04-01" }],
    attendance_policies: [{ policy_id: "ATP-1", created_at: "2026-08-01T10:00:00.000Z" }],
    attendance_incident_counters: [{ counter_id: "CNT-1", last_incident_date: "2026-03-31" }],
    attendance_penalty_transactions: [{ transaction_id: "PEN-1", source_dates: ["2026-06-01", "2026-06-03"] }],
    leave_policies: [{ policy_id: "LVP-1", created_at: "2026-05-01T10:00:00.000Z" }],
    leave_ledger: [{ ledger_id: "LED-1", as_of_date: "2026-06-30" }],
    holiday_calendar: [{ holiday_id: "HOL-1", holiday_date: "2026-10-20" }],
    rosters: [{ roster_id: "ROS-1", start_date: "2026-06-01", end_date: "2026-06-30" }],
    module_rows: [{ row_id: "LR-1", pageKey: "leave-requests", details: { start_date: "2026-07-01", end_date: "2026-07-02" } }]
  };
  const result = integrity.stampAndValidate(snapshot, organization);
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.attendance[0].financial_year_id, "FY-2026-27");
  assert.equal(result.snapshot.attendance_incident_counters[0].financial_year_id, "FY-2025-26");
  assert.equal(result.snapshot.module_rows[0].details.financial_year_id, "FY-2026-27");
});

test("HRMS rejects a supplied year that does not cover the transaction date", () => {
  const result = integrity.stampAndValidate({
    attendance: [{ id: "ATT-1", work_date: "2026-06-01", financial_year_id: "FY-2025-26" }]
  }, organization);
  assert.equal(result.ok, false);
  assert.equal(result.code, "FINANCIAL_YEAR_SCOPE_REJECTED");
  assert.match(result.error, /does not cover the transaction date/);
});

test("HRMS rejects transactions that cross a Financial Year boundary", () => {
  const result = integrity.stampAndValidate({
    rosters: [{ roster_id: "ROS-CROSS", start_date: "2026-03-30", end_date: "2026-04-02" }]
  }, organization);
  assert.equal(result.ok, false);
  assert.match(result.error, /crosses Financial Years/);
});

test("HRMS fails closed when ERP Core has no year for a transaction date", () => {
  const result = integrity.stampAndValidate({
    leave_ledger: [{ ledger_id: "LED-OUT", as_of_date: "2028-01-01" }]
  }, organization);
  assert.equal(result.ok, false);
  assert.match(result.error, /No ERP Core Financial Year covers 2028-01-01/);
});
