const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");
const resolver = fs.readFileSync(path.join(root, "attendance-policy-resolver.cjs"), "utf8");

test("Attendance Policy is an Attendance menu layer with its own permissions", () => {
  assert.match(html, /data-page="attendance-policy">Attendance Policy/);
  assert.match(html, /"attendance-policy": \{ moduleCode: "HRMS_ATTENDANCE", layerCode: "ATTENDANCE_POLICY"/);
  assert.match(html, /title: "Attendance Policy"/);
  assert.match(html, /action: "Create Attendance Policy"/);
});

test("Attendance Policy hides the page-level Export action", () => {
  assert.match(html, /exportButton\.hidden = \["leave-policy", "attendance-policy", "attendance-list", "roster"\]\.includes\(currentPage\) \|\| !canExport;/);
});

test("Attendance Policy hides the table Columns control", () => {
  assert.match(html, /columnButton"\)\.style\.display = isDepartmentMaster \|\| isLeaveRequest \|\| isAttendancePolicy \|\| isLeavePolicy \|\| isLeaveLedger \|\| isHolidayCalendar \? "none" : "";/);
});

test("Attendance Policy list exposes its existing operational rule and audit data", () => {
  assert.match(html, /"Late Grace", "Early Exit Grace", "Minimum Half-Day Work", "Overtime Threshold"/);
  assert.match(html, /"Conversion Rules", "Version", "Last Updated", "Status"/);
  assert.match(html, /function attendancePolicyDurationSummary/);
  assert.match(html, /attendancePolicyDurationSummary\(rules\.late_arrival_grace_minutes\)/);
  assert.match(html, /attendancePolicyDurationSummary\(rules\.early_exit_grace_minutes\)/);
  assert.match(html, /attendancePolicyDurationSummary\(rules\.minimum_half_day_minutes \?\? rules\.half_day_threshold_minutes\)/);
  assert.match(html, /attendancePolicyDurationSummary\(rules\.overtime_threshold_minutes\)/);
  assert.match(html, /const conversionRuleCount = attendancePenaltyRulesForPolicy\(policy\.policy_id\)\.length/);
  assert.match(html, /`V\$\{Math\.max\(1, Number\(policy\.version\) \|\| 1\)\}`/);
  assert.match(html, /policy\.updated_at \? systemDateTimeToDisplay\(policy\.updated_at\) : "—"/);
  assert.match(html, /details\.status \|\| row\[row\.length - 1\] \|\| "Active"/);
});

test("Attendance Policy list keeps the expanded columns aligned", () => {
  assert.match(html, /classList\.toggle\("attendance-policy-view", isAttendancePolicy\)/);
  assert.match(html, /\.attendance-policy-view \.table-wrap table\s*\{[^}]*min-width:\s*1840px;[^}]*table-layout:\s*fixed;/s);
  assert.match(html, /\.attendance-policy-view #moduleTableHead th:nth-child\(8\)[^}]*width:\s*180px;/s);
  assert.match(html, /\.attendance-policy-view #moduleTableHead th:nth-child\(n\+6\):nth-child\(-n\+13\)[^}]*text-align:\s*center;/s);
  assert.match(html, /\.attendance-policy-view #moduleTableBody td:nth-child\(n\+2\):nth-child\(-n\+12\)[^}]*text-overflow:\s*ellipsis;/s);
});

test("Attendance Policy uses the agreed two-step create and edit form", () => {
  assert.match(html, /Policy Details &amp; Rules/);
  assert.match(html, /Including and Excluding Assignments/);
  assert.match(html, /data-attendance-policy-panel="1"/);
  assert.match(html, /data-attendance-policy-panel="2"/);
  assert.match(html, /Next: Assignments/);
  assert.match(html, /data-attendance-policy-add="include"/);
  assert.match(html, /data-attendance-policy-add="exclude"/);
  assert.match(html, /An exclusion overrides an inclusion/);
  assert.match(html, /Full Coverage<\/strong> includes all active direct and franchise employees in the primary organization/);
});

test("Attendance Policy Full Coverage uses the complete authorized scope without requiring one company", () => {
  assert.match(html, /function attendancePolicyAvailableEntities/);
  assert.doesNotMatch(html, /id="recordAttendancePolicyEntity"/);
  assert.match(html, /option value="FULL_COVERAGE">Full Coverage/);
  assert.match(html, /value: "FULL_COVERAGE"/);
  assert.match(html, /value: "FULL_COVERAGE",\s*label: "Full Coverage"/);
  assert.doesNotMatch(html, /label: `Full Coverage ·/);
  assert.match(resolver, /fullCoverageTargets\.has\(storedTarget\.toUpperCase\(\)\)/);
  assert.match(html, /typeSelect\.value === "FULL_COVERAGE" \? "ENTITY" : typeSelect\.value/);
  assert.match(html, /option value="ENTITY">Company \/ Entity/);
  assert.match(html, /recordAttendancePolicyIncludeSearch[^>]+role="combobox"/);
  assert.match(html, /recordAttendancePolicyExcludeSearch[^>]+role="combobox"/);
  assert.match(html, /function attendancePolicyFilteredTargetOptions/);
  assert.match(html, /Policy configuration remains restricted to authorized central HR\/Admin users/);
});

test("Attendance Policy assignment dropdowns show three options before scrolling", () => {
  assert.match(html, /\.attendance-policy-assignment-results\s*\{[^}]*max-height:\s*124px;[^}]*overflow-y:\s*auto;/s);
  assert.match(html, /\.attendance-policy-assignment-results \.attendance-employee-option\s*\{[^}]*min-height:\s*38px;/s);
  assert.match(html, /attendance-employee-results attendance-policy-assignment-results" id="recordAttendancePolicyIncludeResults"/);
  assert.match(html, /attendance-employee-results attendance-policy-assignment-results" id="recordAttendancePolicyExcludeResults"/);
});

test("selected policy assignments scroll inside their boxes instead of stretching the modal", () => {
  assert.match(html, /\.attendance-policy-chip-list\s*\{[^}]*max-height:\s*132px;[^}]*overflow-y:\s*auto;/s);
  assert.match(html, /\.attendance-policy-modal \.modal-body\s*\{[^}]*overflow-y:\s*auto;/s);
});

test("Attendance Policy is not dismissed by an accidental backdrop click", () => {
  const backdropHandler = html.slice(
    html.indexOf('$("#recordModal").addEventListener("click"'),
    html.indexOf('$("#recordForm").addEventListener("submit"')
  );
  assert.match(backdropHandler, /event\.target !== \$\("#recordModal"\)/);
  assert.match(backdropHandler, /event\.preventDefault\(\)/);
  assert.doesNotMatch(backdropHandler, /closeModal\(\)/);
});

test("policy code is generated and status defaults to Active without effective dates", () => {
  assert.match(html, /function nextAttendancePolicyCode/);
  assert.match(html, /\^ATP\(\\d\+\)\$/);
  assert.match(html, /padStart\(4, "0"\)/);
  assert.match(html, /recordAttendancePolicyCode" readonly/);
  assert.match(html, /recordAttendancePolicyStatus" required><option value="Active">Active/);
  const policyModal = html.slice(html.indexOf("function renderAttendancePolicyModalFields"), html.indexOf("function renderRecordModalFields"));
  assert.doesNotMatch(policyModal, /Effective From|Effective To|type="date"/);
});

test("attendance policy durations use separate hour and minute inputs", () => {
  assert.match(html, /function attendancePolicyDurationControl/);
  assert.match(html, /id="\$\{fieldId\}Hours" type="number" min="0" step="1"/);
  assert.match(html, /id="\$\{fieldId\}Minutes" type="number" min="0" max="59" step="1"/);
  assert.match(html, /attendance-policy-duration-separator[^>]*>:</);
  assert.match(html, /\.attendance-policy-duration-inputs\s*\{[^}]*width:\s*220px;[^}]*max-width:\s*100%;/s);
  assert.match(html, /\.field \.attendance-policy-unit-input input\s*\{[^}]*height:\s*36px;/s);
  assert.match(html, /attendance-policy-unit">hr/);
  assert.match(html, /attendance-policy-unit">min/);
  assert.match(html, /input\[type="number"\][^}]*appearance:\s*textfield/s);
  assert.match(html, /recordAttendancePolicyLateGrace", "Late Arrival Grace"/);
  assert.match(html, /recordAttendancePolicyEarlyGrace", "Early Exit Grace"/);
  assert.doesNotMatch(html, /<select id="recordAttendancePolicy(?:Late|Early)Grace"/);
  assert.match(html, /Enter whole hours of zero or more and minutes from 0 to 59/);
  assert.match(html, /\(Number\(fields\.hours\?\.value \|\| 0\) \* 60\) \+ Number\(fields\.minutes\?\.value \|\| 0\)/);
  assert.match(html, /Math\.floor\(safeMinutes \/ 60\)/);
  assert.match(html, /safeMinutes % 60/);
});

test("minimum half-day work and overtime thresholds are persisted and calculated", () => {
  assert.match(html, /recordAttendancePolicyHalfDayThreshold", "Minimum Half-Day Work"/);
  assert.doesNotMatch(html, /recordAttendancePolicyAbsentThreshold/);
  assert.match(html, /recordAttendancePolicyOvertimeThreshold", "Overtime Threshold", 30/);
  assert.match(html, /Below this = Absent\. From this up to the Shift Master net hours = Half Day/);
  assert.match(html, /minimum_half_day_minutes: minimumHalfDayMinutes/);
  assert.match(html, /half_day_threshold_minutes: minimumHalfDayMinutes/);
  assert.match(html, /absent_threshold_minutes: minimumHalfDayMinutes/);
  assert.match(html, /overtime_threshold_minutes: attendancePolicyDurationMinutes/);
  assert.match(html, /applied_minimum_half_day_minutes/);
  assert.match(html, /applied_half_day_threshold_minutes/);
  assert.match(html, /applied_absent_threshold_minutes/);
  assert.match(html, /applied_full_day_requirement_minutes/);
  assert.match(html, /applied_overtime_threshold_minutes/);
  assert.match(resolver, /dayStatus = "Half Day"/);
  assert.match(resolver, /dayStatus = "Absent"/);
  assert.match(resolver, /let fullDayRequirementMinutes = assignmentNetWorkMinutes/);
  assert.match(resolver, /fullDayQualifiedBy = "PERMITTED_GRACE_WINDOWS"/);
  assert.match(resolver, /scheduledEnd \+ overtimeThresholdMinutes/);
  assert.doesNotMatch(resolver, /scheduledEnd \+ 30/);
});

test("Attendance Policy persists in dedicated mock database tables", () => {
  assert.match(server, /attendance_policies:\s*\{/);
  assert.match(server, /attendance_policy_assignments:\s*\{/);
  assert.match(html, /attendance_policies: attendancePolicies\.map/);
  assert.match(html, /attendance_policy_assignments: attendancePolicyAssignments\.map/);
  assert.match(html, /await persistHrmsReserve\(\)/);
  assert.match(html, /syncAttendancePolicyPage\(\)/);
  assert.match(server, /url\.pathname === "\/attendance-policy-resolver\.cjs"/);
});

test("Attendance Policy is wired into punch and register recalculation", () => {
  const punchRule = html.slice(html.indexOf("function attendancePunchIssue"), html.indexOf("function syncAttendanceRecordModal"));
  assert.match(html, /function resolveAttendancePolicyForEmployee/);
  assert.match(html, /AttendancePolicyResolver\.resolvePolicy/);
  assert.match(punchRule, /attendancePunchAssessment/);
  assert.match(html, /function recalculateAttendancePolicyDerivedRows/);
  assert.match(html, /recalculateAttendancePolicyDerivedRows\(\);\s*reconcileLeaveLedgerEntries\(\);\s*const persistenceTarget = await persistHrmsReserve/);
  assert.match(html, /applied_policy_id/);
  assert.match(html, /attendance_policy_applied/);
  assert.match(html, /applied_late_arrival_grace_minutes/);
  assert.match(html, /applied_shift_net_work_minutes/);
  assert.match(html, /calculated_timing_incidents/);
});

test("Attendance Register explains the safe fallback when no active policy exists", () => {
  assert.match(html, /function syncAttendancePolicyStateBanner/);
  assert.match(html, /Attendance policy missing/);
  assert.match(html, /affected records stay Pending Configuration and cannot auto-approve/);
  assert.match(html, /syncAttendancePolicyStateBanner\(isAttendanceRegister\)/);
});

test("Attendance Register separates day status, timing incidents and automatic review state", () => {
  assert.match(html, /"Timing Incident", "Day Status", "Pay Treatment", "Review Status"/);
  assert.match(html, /function attendanceAutomaticDecisionState/);
  assert.match(html, /review_status: "AUTO_APPROVED"/);
  assert.match(html, /attendanceShiftHasClosed/);
});
