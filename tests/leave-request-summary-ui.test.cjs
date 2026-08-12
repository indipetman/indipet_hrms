const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("Leave Requests exposes the agreed five-card operational summary", () => {
  assert.match(html, /\["Pending Requests", "Approved Today", "Employees on Leave Today", "Balance Exceptions", "Coverage Blocks"\]/);
  assert.match(html, /"Requests awaiting approval"/);
  assert.match(html, /"Requests approved today"/);
  assert.match(html, /"Employees currently on approved leave"/);
  assert.match(html, /"Requests exceeding or missing available balance"/);
  assert.match(html, /"Requests blocked by staffing or daily leave limits"/);
});

test("Leave Request summary values are recalculated from role-and-filter-scoped records", () => {
  assert.match(html, /function updateLeaveRequestValues\(rows = hrmsScopedModuleRows\("leave-requests"\)\)/);
  assert.match(html, /if \(isLeaveRequest\) updateLeaveRequestValues\(rowsWithoutStatus\)/);
  assert.match(html, /const pending = records\.filter\(leaveRequestIsPending\)/);
  assert.match(html, /leaveRequestDecisionDate\(record\) === today/);
  assert.match(html, /leaveRequestCoversDate\(record, today\)/);
  assert.match(html, /leaveRequestBalanceExceptionCount\(records\)/);
  assert.match(html, /pending\.filter\(record => leaveRequestHasCoverageBlock\(record, capSnapshot\)\)\.length/);
});

test("Balance and coverage cards use existing Excel-backed business resolvers", () => {
  assert.match(html, /leaveLedgerBalancesForEmployee\(record\.employeeId\)/);
  assert.match(html, /HrmsLeaveCapResolver\.evaluateApproval\(snapshot \|\| hrmsLeaveCapSnapshot\(\), candidate\)/);
  assert.match(html, /moduleSummary\.classList\.toggle\("leave-request-summary-grid", isLeaveRequest\)/);
  assert.match(html, /\.module-summary\.leave-request-summary-grid/);
});
