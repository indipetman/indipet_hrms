const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

test("Leave Management navigation exposes workflows instead of internal policy tables", () => {
  const leaveStart = html.indexOf('data-page="leave-requests"');
  const leaveMenu = html.slice(
    leaveStart,
    html.indexOf('data-page="roster"', leaveStart)
  );
  assert.match(leaveMenu, /data-page="leave-requests">Leave Requests/);
  assert.match(leaveMenu, /data-page="leave-policy">Leave Policy/);
  assert.match(leaveMenu, /data-page="holiday-calendar">Holiday Calendar/);
  assert.match(leaveMenu, /data-page="leave-ledger">Leave Ledger/);
  assert.doesNotMatch(leaveMenu, />Leave Type Master</);
  assert.doesNotMatch(leaveMenu, />Policy Variants</);
  assert.doesNotMatch(leaveMenu, />Policy Assignments</);
  assert.doesNotMatch(html, /layerCode: "LEAVE_TYPE_MASTER"/);
  assert.doesNotMatch(html, /layerCode: "POLICY_VARIANTS"/);
  assert.doesNotMatch(html, /layerCode: "POLICY_ASSIGNMENTS"/);
});

test("Leave Ledger replaces CO Ledger under Leave Management", () => {
  const attendanceStart = html.indexOf('data-group="attendance"');
  const attendanceMenu = html.slice(
    attendanceStart,
    html.indexOf('data-group="payroll"', attendanceStart)
  );
  assert.doesNotMatch(attendanceMenu, /data-page="leave-ledger"/);
  assert.match(html, /"leave-ledger": \{/);
  assert.match(html, /title: "Leave Ledger"/);
  assert.doesNotMatch(html, /data-page="co-ledger"/);
});

test("Leave Policy has a dedicated operational page", () => {
  assert.match(html, /title: "Leave Policy"/);
  assert.match(html, /action: "Create Leave Policy"/);
  assert.match(html, /labels: \["Active Policies", "Leave Types", "Assignment Rules"\]/);
  assert.doesNotMatch(html, /labels: \["Total Policies", "Active Policies", "Leave Types", "Assignment Rules"\]/);
  assert.match(html, /columns: \["Policy Code", "Policy", "Leave Types", "Coverage", "Version", "Status"\]/);
  assert.match(html, /function syncLeavePolicyPage/);
  assert.match(html, /function updateLeavePolicyValues/);
  assert.match(html, /isLeavePolicy \|\| isLeaveLedger \|\| isHolidayCalendar/);
  assert.match(html, /const leaveTypeScope = rules\.length/);
  assert.match(html, /rule\.leave_name \|\| rule\.leave_code/);
  assert.match(html, /leave-policy-view #moduleTableBody td:nth-child\(4\)/);
  assert.match(html, /exportButton\.hidden = \["leave-policy", "attendance-policy", "attendance-list", "roster"\]\.includes\(currentPage\) \|\| !canExport/);
});

test("Leave Ledger builds one dynamic balance column for every active leave type", () => {
  assert.match(html, /function activeLeaveLedgerTypes/);
  assert.match(html, /leaveTypes\.map\(type => `\$\{type\.leave_name\} \(\$\{type\.leave_code\}\)`\)/);
  assert.match(html, /function resolveLeavePolicyForEmployee/);
  assert.match(html, /function reconcileLeaveLedgerEntries/);
  assert.match(html, /function syncLeaveLedgerPage/);
  assert.match(html, /"Total Available"/);
  assert.match(html, /function runLeaveLedgerExport/);
  assert.match(html, /leave_code: "CO"/);
  assert.match(html, /leave_name: "Compensatory Off"/);
  assert.match(html, /pendingBalances\[index\].*pending/s);
});

test("Leave Ledger is Excel-backed and legacy CO rows migrate into it", () => {
  assert.match(server, /leave_ledger:\s*\{/);
  assert.match(server, /pre-leave-ledger-/);
  assert.match(server, /"source_type", "source_id", "holiday_id"/);
  assert.match(server, /needsLeaveLedgerColumnMigration/);
  assert.match(server, /pre-leave-ledger-source-columns/);
  assert.match(server, /Migrated from CO Ledger/);
  assert.match(server, /record\.pageKey !== "co-ledger"/);
  assert.match(html, /leave_ledger: leaveLedgerEntries\.map/);
  assert.match(html, /data\.leave_ledger/);
  assert.match(html, /addPendingCompOffToLeaveLedger/);
});

test("Leave Policy uses one three-step workflow", () => {
  assert.match(html, /data-leave-policy-step="1"/);
  assert.match(html, /data-leave-policy-step="2"/);
  assert.match(html, /data-leave-policy-step="3"/);
  assert.match(html, /Policy Details/);
  assert.match(html, /Leave Types and Entitlements/);
  assert.match(html, /Including and Excluding Assignments/);
  assert.match(html, /Next: Entitlements/);
  assert.match(html, /Next: Assignments/);
  assert.match(html, /An exclusion overrides an inclusion/);
});

test("Leave entitlement rules contain the initial operational controls", () => {
  assert.match(html, /data-leave-policy-rule-field="leave_code"/);
  assert.match(html, /data-leave-policy-rule-field="leave_name"/);
  assert.match(html, /data-leave-policy-rule-field="annual_entitlement_days"/);
  assert.match(html, /data-leave-policy-rule-field="accrual_method"/);
  assert.match(html, /data-leave-policy-rule-field="paid"/);
  assert.match(html, /data-leave-policy-rule-field="carry_forward_enabled"/);
  assert.match(html, /data-leave-policy-rule-field="max_carry_forward_days"/);
  assert.match(html, /data-leave-policy-rule-field="proof_required"/);
  assert.match(html, /Leave codes must be unique/);
});

test("Leave Policy assignments are searchable and support Full Coverage", () => {
  assert.match(html, /recordLeavePolicyIncludeSearch[^>]+role="combobox"/);
  assert.match(html, /recordLeavePolicyExcludeSearch[^>]+role="combobox"/);
  assert.match(html, /option value="FULL_COVERAGE">Full Coverage/);
  assert.match(html, /function configureLeavePolicyAssignmentCombobox/);
  assert.match(html, /function assignmentsForLeavePolicyMatch/);
  assert.match(html, /Resolved Coverage Preview/);
});

test("Leave Policy persists policies, rules and assignments separately", () => {
  assert.match(server, /leave_policies:\s*\{/);
  assert.match(server, /leave_policy_rules:\s*\{/);
  assert.match(server, /leave_policy_assignments:\s*\{/);
  assert.match(server, /"paid", "carry_forward_enabled", "proof_required"/);
  assert.match(html, /leave_policies: leavePolicies\.map/);
  assert.match(html, /leave_policy_rules: leavePolicyRules\.map/);
  assert.match(html, /leave_policy_assignments: leavePolicyAssignments\.map/);
  assert.match(html, /syncLeavePolicyPage\(\);\s*const persistenceTarget = await persistHrmsReserve/s);
});

test("Leave Policy edit and delete operate on all dedicated records", () => {
  assert.match(html, /if \(actionPage === "leave-policy"\)/);
  assert.match(html, /leavePolicies\.splice/);
  assert.match(html, /leavePolicyRules\[index\]\.policy_id/);
  assert.match(html, /leavePolicyAssignments\[index\]\.policy_id/);
  assert.match(html, /openModal\(\{ mode: "edit", rowIndex \}\)/);
});
