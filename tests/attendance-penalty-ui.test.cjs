const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");
const boundary = fs.readFileSync(path.join(root, "hrms-data-boundary.cjs"), "utf8");

test("Attendance Policy provides a data-driven incident conversion rule builder", () => {
  assert.match(html, /Incident Conversion Rules/);
  assert.match(html, /data-attendance-penalty-add/);
  assert.match(html, /data-penalty-rule-field="incident_code"/);
  assert.match(html, /data-penalty-rule-field="occurrence_threshold"/);
  assert.match(html, /data-penalty-rule-field="counting_period_type"/);
  assert.match(html, /data-penalty-rule-field="consequence_type"/);
  assert.match(html, /data-penalty-rule-field="leave_code"/);
  assert.match(html, /data-penalty-rule-field="insufficient_balance_action"/);
  assert.match(html, /Only Approved, Auto-approved or Overridden attendance is counted/);
  assert.match(html, /Select incident/);
  assert.match(html, /Select counting period/);
  assert.match(html, /Select consequence/);
  assert.doesNotMatch(html, /data-penalty-rule-field="priority"/);
  assert.doesNotMatch(html, /Lower number runs first/);
  assert.match(html, /priority: \(index \+ 1\) \* 10/);
});

test("the builder is not hardcoded to three late arrivals or Casual Leave", () => {
  assert.match(html, /Occurrences <span class="field-state required">Required/);
  assert.match(html, /attendancePenaltyLeaveOptions/);
  assert.match(html, /leavePolicyRules/);
  assert.match(html, /Convert to Loss of Pay/);
  assert.match(html, /Send to Manual Review/);
  assert.match(html, /Rule \$\{index \+ 1\}: Select an incident/);
  assert.match(html, /Rule \$\{index \+ 1\}: Select a counting period/);
  assert.match(html, /Rule \$\{index \+ 1\}: Select a consequence/);
});

test("penalty tables are Excel-owned, serialized and reloaded", () => {
  for (const table of [
    "attendance_penalty_rules",
    "attendance_incident_counters",
    "attendance_penalty_transactions",
    "attendance_penalty_audit"
  ]) {
    assert.match(server, new RegExp(`${table}: \\{`));
    assert.match(boundary, new RegExp(`"${table}"`));
    assert.match(html, new RegExp(`${table}:`));
  }
  assert.match(server, /HrmsAttendancePenaltyResolver\.reconcile/);
  assert.match(server, /HrmsAttendancePenaltyResolver\.validateSnapshot/);
  assert.match(html, /AttendancePenaltyResolver\.reconcile/);
  assert.doesNotMatch(html, /function attendancePenaltySnapshot\(\) \{\s*return hrmsReserveSnapshot\(\);/s);
  assert.match(html, /function attendancePenaltySnapshot\(\)[\s\S]*attendance_penalty_rules: attendancePenaltyRules\.map/);
});

test("Attendance Policy save requires Excel acknowledgement and restores the previous state on failure", () => {
  assert.match(html, /const attendanceSaveSnapshot = JSON\.parse\(JSON\.stringify\(hrmsReserveSnapshot\(\)\)\)/);
  assert.match(html, /if \(persistenceTarget !== "excel"\) \{\s*restoreEmployeeSaveSnapshot\(attendanceSaveSnapshot\)/s);
  assert.match(html, /Attendance Policy was not saved to the Excel database\. Your previous data was restored/);
});

test("penalty-derived leave deductions and LOP are reconciled into the existing ledgers", () => {
  assert.match(html, /function reconcileAttendancePenaltyEntries/);
  assert.match(html, /AttendancePenaltyResolver\.leaveDeductionUnits/);
  assert.match(html, /attendance_penalty_transactions: attendancePenaltyTransactions/);
  assert.match(html, /reconcileAttendancePenaltyEntries\(\);/);
});
