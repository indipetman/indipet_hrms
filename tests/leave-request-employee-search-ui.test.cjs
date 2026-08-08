const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const modalSource = html.slice(
  html.indexOf("function closeLeaveEmployeeResults"),
  html.indexOf("function attendanceEmployeeContext")
);
const renderStart = html.indexOf("function renderRecordModalFields");
const leaveMarkupStart = html.indexOf('if (pageKey === "leave-requests")', renderStart);
const leaveMarkupSource = html.slice(
  leaveMarkupStart,
  html.indexOf('if (pageKey === "attendance-list")', leaveMarkupStart)
);
const editSource = html.slice(
  html.indexOf("if (row && isLeaveRequest)"),
  html.indexOf('if (row && activePage === "department-master")')
);
const submitStart = html.indexOf('$("#recordForm").addEventListener("submit"');
const leaveSubmitStart = html.indexOf('if (activePage === "leave-requests")', submitStart);
const submitSource = html.slice(
  leaveSubmitStart,
  html.indexOf('if (activePage === "holiday-calendar")', leaveSubmitStart)
);

test("leave request employee selection is a searchable, scrollable combobox", () => {
  assert.match(leaveMarkupSource, /id="recordLeaveEmployeeSearch"[^>]*type="search"/);
  assert.match(leaveMarkupSource, /Search employee name, ID or location/);
  assert.match(leaveMarkupSource, /role="combobox"/);
  assert.match(leaveMarkupSource, /id="recordLeaveEmployeeResults"[^>]*role="listbox"/);
  assert.match(leaveMarkupSource, /id="recordLeaveEmployee"[^>]*data-record-field="employee_id"[^>]*type="hidden"/);
  assert.doesNotMatch(leaveMarkupSource, /<select id="recordLeaveEmployee"/);
  assert.match(html, /\.attendance-employee-results\s*\{[\s\S]*?max-height:\s*220px;[\s\S]*?overflow-y:\s*auto;/);
});

test("leave employee search filters live and supports mouse and keyboard selection", () => {
  assert.match(modalSource, /attendanceEmployeeOptions\(query\)/);
  assert.match(modalSource, /data-leave-employee-id/);
  assert.match(modalSource, /selectLeaveEmployee\(button\.dataset\.leaveEmployeeId\)/);
  assert.match(modalSource, /search\.addEventListener\("input"/);
  assert.match(modalSource, /ArrowDown/);
  assert.match(modalSource, /ArrowUp/);
  assert.match(modalSource, /event\.key === "Enter"/);
  assert.match(modalSource, /event\.key === "Escape"/);
  assert.match(modalSource, /scrollIntoView\(\{ block: "nearest" \}\)/);
});

test("leave request edit and save retain the employee ID behind the searchable label", () => {
  assert.match(editSource, /\$\("#recordLeaveEmployee"\)\.value = employeeId/);
  assert.match(editSource, /\$\("#recordLeaveEmployeeSearch"\)\.value = employee/);
  assert.match(submitSource, /const employeeId = String\(\$\("#recordLeaveEmployee"\)\.value \|\| ""\)/);
  assert.match(submitSource, /markLeaveEmployeeInvalid\(\)/);
  assert.match(submitSource, /await persistHrmsReserve\(\)/);
});

test("leave request shows each selected employee balance beside every linked leave type", () => {
  assert.match(modalSource, /activeLeaveLedgerTypes\(\)/);
  assert.match(html, /leave_code: "CO",\s*leave_name: "Compensatory Off",\s*system_managed: true/);
  assert.doesNotMatch(leaveMarkupSource, /Available Leave Balances/);
  assert.doesNotMatch(leaveMarkupSource, /recordLeaveBalancePanel/);
  assert.match(modalSource, /function updateLeaveRequestTypeOptions/);
  assert.match(html, /function updateLeaveTypeBalanceOptions/);
  assert.match(modalSource, /leaveLedgerBalancesForEmployee\(normalizedEmployeeId\)/);
  assert.match(html, /leaveTypeBalanceOptionLabel\(type, Boolean\(normalizedEmployeeId\)\)/);
  assert.match(html, /day\$\{availableDays === 1 \? "" : "s"\} available/);
  assert.match(modalSource, /updateLeaveRequestTypeOptions\(hidden\.value\)/);
  assert.match(editSource, /updateLeaveRequestTypeOptions\(employeeId, details\.leave_code \|\| ""\)/);
});

test("leave requests cannot exceed the displayed Excel-backed balance", () => {
  assert.match(html, /function leaveLedgerBalancesForEmployee/);
  assert.match(html, /storedAvailable - approvedSystemManagedDays/);
  assert.match(submitSource, /const requestedDays = leavePortion === "FULL_DAY"/);
  assert.match(submitSource, /const selectedBalance = leaveLedgerBalancesForEmployee\(employeeId\)/);
  assert.match(submitSource, /requestedDays > availableDays/);
  assert.match(submitSource, /requested_days: requestedDays/);
});

test("leave request modal is not dismissed by an accidental backdrop click", () => {
  const backdropHandler = html.slice(
    html.indexOf('$("#recordModal").addEventListener("click"'),
    html.indexOf("$$('[data-attendance-override-close]')")
  );
  assert.match(backdropHandler, /event\.target !== \$\("#recordModal"\)/);
  assert.match(backdropHandler, /event\.preventDefault\(\)/);
  assert.match(backdropHandler, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(backdropHandler, /closeModal\(\)/);
});
