const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("Leave Requests keeps its fixed columns and hides the Columns organizer", () => {
  assert.match(
    html,
    /columnButton"\)\.style\.display = isDepartmentMaster \|\| isLeaveRequest \|\| isAttendancePolicy \|\| isLeavePolicy \|\| isLeaveLedger \|\| isHolidayCalendar \? "none" : "";/
  );
});

test("Leave Request export uses current role scope and table filters", () => {
  assert.match(html, /function filteredLeaveRequestRowsForExport\(\)/);
  assert.match(html, /return hrmsScopedModuleRows\("leave-requests"\)\.filter/);
  assert.match(html, /\(!search \|\| rowText\.includes\(search\)\)/);
  assert.match(html, /moduleRowMatchesLocation\("leave-requests", row, location\)/);
  assert.match(html, /\(status === "all" \|\| rowStatus === status\)/);
  assert.match(html, /const headers = \[\.\.\.\(pageConfig\["leave-requests"\]\?\.columns \|\| \[\]\)\];/);
  assert.match(html, /leaveRequestDaysLabel\(row\)/);
});

test("Leave Requests Export button offers Excel and PDF downloads", () => {
  assert.match(html, /if \(activePage === "leave-requests"\) \{\s*openExportFormatMenu\(\{ context: "leave-requests" \}\);/);
  assert.match(html, /else if \(exportContext === "leave-requests"\) runLeaveRequestExport\(format\);/);
  assert.match(html, /function runLeaveRequestExport\(format = "excel"\)/);
  assert.match(html, /exportRosterDatasetExcel\(dataset, leaveRequestExportFileName\("xlsx"\), "Leave Requests"\)/);
  assert.match(html, /title: "Leave Requests"/);
  assert.match(html, /fileName: leaveRequestExportFileName\("pdf"\)/);
});

test("Leave Requests does not create a blank export for empty filtered results", () => {
  assert.match(html, /showToast\("No leave requests match the current filters\.", "error"\);/);
});

test("Leave Requests displays a calculated No. of Days column without changing persisted row positions", () => {
  assert.match(html, /\["Request ID", "Employee", "Leave Type", "Dates", "No\. of Days", "Status"\]/);
  assert.match(html, /function leaveRequestRequestedDays\(row = \[\]\)/);
  assert.match(html, /details\.requested_days \?\? details\.approved_days \?\? details\.days/);
  assert.match(html, /String\(details\.leave_portion \|\| "FULL_DAY"\)\.toUpperCase\(\) !== "FULL_DAY"\) return 0\.5/);
  assert.match(html, /function leaveRequestTableCells\(row = \[\]\)/);
  assert.match(html, /isLeaveRequest \? leaveRequestTableCells\(row\)\.map/);
  assert.match(html, /row\[row\.length - 1\] \|\| "Pending"/);
});
