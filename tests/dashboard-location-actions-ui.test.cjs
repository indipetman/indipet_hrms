const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");

const dashboardSource = html.slice(
  html.indexOf("function dashboardSelectedLocation"),
  html.indexOf("function updateBulkBar")
);
const dashboardActionSource = html.slice(
  html.indexOf("function openDashboardExistingRecordWindow"),
  html.indexOf('$(".page-actions").addEventListener')
);
const modalSource = html.slice(
  html.indexOf("function attendanceEmployeeOptions"),
  html.indexOf("function ensureModuleActionMenu")
);
const submitSource = html.slice(
  html.indexOf('$("#recordForm").addEventListener("submit"'),
  html.indexOf('$("#recordModalBody").addEventListener')
);

test("dashboard exposes one blue location scope plus the red and green workflow actions", () => {
  assert.match(html, /id="dashboardLocationScope"[^>]*aria-label="Dashboard location"/);
  assert.match(html, /id="dashboardAssignLeave"[^>]*>[\s\S]*?Assign Leave/);
  assert.match(html, /id="primaryAction"[^>]*>[\s\S]*?Add Attendance/);
  assert.match(html, /\.dashboard-location-action\s*\{[\s\S]*?height:\s*36px;[\s\S]*?border:\s*1px solid var\(--border-strong\);[\s\S]*?background:\s*#fff;[\s\S]*?color:\s*var\(--text-secondary\)/);
  assert.match(html, /\.dashboard-location-action:focus-within\s*\{[\s\S]*?border-color:\s*var\(--primary\)/);
  assert.match(html, /\.dashboard-location-action select\s*\{[\s\S]*?color:\s*var\(--text\);[\s\S]*?font-size:\s*11\.5px/);
  assert.match(html, /\.button\.dashboard-leave-action\s*\{[\s\S]*?background:\s*var\(--red\)/);
  assert.match(html, /\.button\.dashboard-attendance-action\s*\{[\s\S]*?background:\s*var\(--green\)/);
  assert.doesNotMatch(html, /id="chartLocation"/);
  assert.doesNotMatch(html, /class="filter-select location-filter"/);
});

test("the dashboard location selection scopes every dashboard data surface", () => {
  assert.match(html, /let dashboardLocationId = "all"/);
  assert.match(dashboardSource, /function dashboardEmployeeRows/);
  assert.match(dashboardSource, /function dashboardAttendanceRecords/);
  assert.match(dashboardSource, /function dashboardModuleRows/);
  assert.match(dashboardSource, /function moduleRowMatchesLocation/);
  assert.match(dashboardSource, /HrmsLocationScope\.rowMatchesLocation/);
  assert.match(dashboardSource, /function dashboardRosterRows/);
  assert.match(dashboardSource, /const employeeRows = dashboardEmployeeRows\(\)/);
  assert.match(dashboardSource, /const scopedAttendance = dashboardAttendanceRecords\(\)/);
  assert.match(dashboardSource, /dashboardModuleRows\("approvals"\)/);
  assert.match(dashboardSource, /const rosterRows = dashboardRosterRows\(\)/);
  assert.match(dashboardSource, /function dashboardWeeklyAttendanceData[\s\S]*dashboardAttendanceRecords\(\)/);
  assert.match(dashboardSource, /function renderAttendance[\s\S]*dashboardAttendanceRecords\(\)/);
  assert.match(html, /dashboardLocationScope"\)\.addEventListener\("change"[\s\S]*updateHrmsDashboardSummary\(\);[\s\S]*renderWeeklyChart\(\);[\s\S]*renderAttendance\(\)/);
});

test("dashboard and linked modules share the same source-and-employee location resolver", () => {
  assert.match(html, /<script src="hrms-location-scope\.cjs"><\/script>/);
  assert.match(dashboardSource, /return rows\.filter\(row => moduleRowMatchesLocation\(pageKey, row, location\.id\)\)/);
  assert.match(html, /moduleRowMatchesLocation\("leave-requests", row, location\)/);
  assert.match(html, /moduleRowMatchesLocation\(pageKey, row, location\)/);
});

test("Attendance Trend joins workflow decisions to Excel attendance and exposes traceable dates and counts", () => {
  assert.match(dashboardSource, /moduleRowSourceRecords\["attendance-list"\]/);
  assert.match(dashboardSource, /status: details\.final_status \|\| details\.day_status \|\| details\.status \|\| record\.status/);
  assert.match(dashboardSource, /work_date: details\.work_date \|\| record\.work_date/);
  assert.match(dashboardSource, /attendance_bucket: attendanceBucket\(record\)/);
  assert.match(dashboardSource, /\.sort\(\)\.slice\(-7\)/);
  assert.match(dashboardSource, /systemDateToDisplay\(data\[0\]\.date\).*systemDateToDisplay\(data\.at\(-1\)\.date\)/s);
  assert.match(dashboardSource, /class="chart-total">\$\{total\}/);
  assert.match(dashboardSource, /class="chart-date">\$\{item\.dateLabel\}/);
  assert.match(dashboardSource, /status === "HALF_DAY"\) return "half_day"/);
  assert.match(dashboardSource, /class="bar half-day" style="height:\$\{halfDayHeight\}%"/);
  assert.match(dashboardSource, /aria-label="\$\{item\.fullDateLabel\}: \$\{item\.present\} present, \$\{item\.halfDay\} half day/);
  assert.match(html, /legend-dot" style="background:rgba\(196,126,34,\.64\)"><\/span>Half Day/);
});

test("dashboard actions reuse the existing Attendance and Leave windows without changing the active dashboard", () => {
  assert.match(dashboardActionSource, /openDashboardExistingRecordWindow\("attendance-list"\)/);
  assert.match(html, /dashboardAssignLeave"\)\.addEventListener[\s\S]*openDashboardExistingRecordWindow\("leave-requests"\)/);
  assert.match(dashboardActionSource, /openModal\(\{[\s\S]*pageKey,[\s\S]*locationId:/);
  assert.match(modalSource, /function openModal\(\{ mode = "create", rowIndex = -1, pageKey = activePage, locationId = "" \} = \{\}\)/);
  assert.match(modalSource, /recordModalPageKey = modalPageKey/);
  assert.match(modalSource, /recordModalLocationId = String\(locationId \|\| ""\)/);
  assert.match(modalSource, /const contextLocation = recordModalLocationId/);
  assert.match(modalSource, /contextTokens\.has\(token\)/);
  assert.match(submitSource, /const submissionPage = recordModalPageKey \|\| activePage/);
  assert.match(submitSource, /if \(submissionPage === "leave-requests"\)/);
  assert.match(submitSource, /if \(submissionPage === "attendance-list"\)/);
});

test("Create employee quick action opens the existing new-employee workflow without an employee-count hint", () => {
  const createEmployeeQuickAction = html.slice(
    html.indexOf('id="dashboardCreateEmployee"'),
    html.indexOf("</button>", html.indexOf('id="dashboardCreateEmployee"'))
  );
  assert.match(createEmployeeQuickAction, /<span class="quick-name">Create employee<\/span>/);
  assert.doesNotMatch(createEmployeeQuickAction, /quick-hint|active employees/);
  assert.match(html, /dashboardCreateEmployee"\)\?\.addEventListener\("click"[\s\S]*hrmsRequirePagePermission\("employee-master", "Create"\)[\s\S]*openEmployeeForm\(\{[\s\S]*mode: "create",[\s\S]*locationId: dashboardLocationId === "all" \? "" : dashboardLocationId/);
  assert.match(html, /function openEmployeeForm\(\{ mode = "create", employeeId = null, locationId = "" \} = \{\}\)/);
  assert.match(html, /else if \(locationId\)[\s\S]*setEmployeeFieldValue\("parent_entity_id", location\.parentCode \|\| ""\)[\s\S]*populateEmployeeLocationOptions\(location\.id\)[\s\S]*setEmployeeFieldValue\("location_id", location\.id\)/);
  assert.doesNotMatch(html, /quickHints\[0\][\s\S]*activeEmployees/);
});

test("Review quick actions show red numeric badges only when work is pending", () => {
  const leaveActionStart = html.indexOf('id="dashboardReviewLeave"', html.indexOf("Quick Actions"));
  const rosterActionStart = html.indexOf('id="dashboardOpenRoster"', html.indexOf("Quick Actions"));
  const attendanceActionStart = html.indexOf('id="dashboardReviewAttendance"', html.indexOf("Quick Actions"));
  const leaveAction = html.slice(leaveActionStart, html.indexOf("</button>", leaveActionStart));
  const rosterAction = html.slice(rosterActionStart, html.indexOf("</button>", rosterActionStart));
  const attendanceAction = html.slice(attendanceActionStart, html.indexOf("</button>", attendanceActionStart));
  assert.match(leaveAction, /id="dashboardLeavePendingBadge" hidden/);
  assert.match(rosterAction, /id="dashboardRosterOpenBadge" hidden/);
  assert.match(attendanceAction, /id="dashboardAttendancePendingBadge" hidden/);
  assert.doesNotMatch(leaveAction, /quick-hint|pending requests/);
  assert.doesNotMatch(rosterAction, /quick-hint|open slots/);
  assert.doesNotMatch(attendanceAction, /quick-hint|attendance exceptions/);
  assert.match(html, /\.quick-count-badge\s*\{[\s\S]*?border-radius:\s*999px;[\s\S]*?background:\s*var\(--red\);[\s\S]*?color:\s*#fff/);
  assert.match(dashboardSource, /function setDashboardQuickCountBadge/);
  assert.match(dashboardSource, /badge\.hidden = normalizedCount === 0/);
  assert.match(dashboardSource, /normalizedCount > 99 \? "99\+"/);
  assert.match(dashboardSource, /dashboardModuleRows\("leave-requests"\)[\s\S]*?toLowerCase\(\) === "pending"/);
  assert.match(dashboardSource, /dashboardModuleRows\("attendance-list"\)[\s\S]*?attendanceReviewStatus\(row\) === "Pending Review"/);
  assert.match(dashboardSource, /setDashboardQuickCountBadge\(\$\("#dashboardLeavePendingBadge"\), pendingLeaveRequests/);
  assert.match(dashboardSource, /setDashboardQuickCountBadge\(\$\("#dashboardRosterOpenBadge"\), openRosterSlots/);
  assert.match(dashboardSource, /setDashboardQuickCountBadge\(\$\("#dashboardAttendancePendingBadge"\), pendingAttendanceReviews/);
});

test("dashboard navigation carries the selected location into every linked workflow", () => {
  assert.match(html, /function applyDashboardLocationToModule\(pageKey\)[\s\S]*dashboardSelectedLocation\(\)[\s\S]*locationFilter\.options[\s\S]*locationFilter\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
  assert.match(html, /function openDashboardScopedModule\(pageKey\)[\s\S]*hrmsRequirePagePermission\(pageKey, "View"\)[\s\S]*activatePage\(pageKey\)[\s\S]*applyDashboardLocationToModule\(pageKey\)/);
  assert.match(html, /dashboardReviewLeave"\)\?\.addEventListener\("click", \(\) => openDashboardScopedModule\("leave-requests"\)\)/);
  assert.match(html, /dashboardReviewAttendance"\)\?\.addEventListener\("click", \(\) => openDashboardScopedModule\("attendance-list"\)\)/);
  assert.match(html, /dashboardViewAllAttendance"\)\?\.addEventListener\("click", \(\) => openDashboardScopedModule\("attendance-list"\)\)/);
});

test("Open roster shows all locations from All Locations and opens the selected location board directly", () => {
  const rosterBoardSource = html.slice(
    html.indexOf("function openRosterBoard"),
    html.indexOf("function renderRosterBoardTabs")
  );
  assert.match(html, /function openDashboardRoster\(\)[\s\S]*dashboardLocationId === "all"[\s\S]*activatePage\("roster"\)[\s\S]*openRosterBoard\("", dashboardLocationId\)/);
  assert.match(html, /dashboardOpenRoster"\)\?\.addEventListener\("click", openDashboardRoster\)/);
  assert.match(rosterBoardSource, /locationId[\s\S]*overviewRecords\.find\(item => item\.locationId === locationId\)/);
  assert.match(rosterBoardSource, /record\?\.sourceRecord \|\| normalizeRosterRecord\(\{[\s\S]*location_id: location\.id,[\s\S]*status: record\?\.status \|\| "Not Generated"/);
  assert.match(rosterBoardSource, /selectedLocationId = location\.id/);
});

test("dashboard action permissions remain separated by workflow", () => {
  const permissionSource = html.slice(
    html.indexOf("function syncHrmsActionPermissions"),
    html.indexOf("function revealHrmsApp")
  );
  assert.match(permissionSource, /currentPage === "dashboard" \? "attendance-list"/);
  assert.match(permissionSource, /dashboardAssignLeave\.hidden = currentPage !== "dashboard" \|\| !hrmsCanAccessPage\("leave-requests", "Create"\)/);
  assert.match(permissionSource, /dashboardCreateEmployee\.hidden = currentPage !== "dashboard" \|\| !hrmsCanAccessPage\("employee-master", "Create"\)/);
  assert.match(permissionSource, /dashboardLocationAction\.hidden = currentPage !== "dashboard"/);
  assert.match(dashboardActionSource, /hrmsRequirePagePermission\(pageKey, "Create"\)/);
});

test("dashboard-origin attendance and leave saves still require Excel acknowledgement", () => {
  assert.match(submitSource, /const attendanceSaveSnapshot = hrmsReserveSnapshot\(\)/);
  assert.match(submitSource, /(?:const|let) persistenceTarget = await persistHrmsReserve\(\)/);
  assert.match(submitSource, /persistenceTarget !== "excel"[\s\S]*applyHrmsReserve\(attendanceSaveSnapshot\)/);
  assert.match(submitSource, /Attendance was not saved\. The Excel database did not acknowledge it/);
  assert.match(submitSource, /Leave request was not saved\. \$\{failureDetail\} Your entered values remain in this form/);
  assert.match(submitSource, /if \(activePage === "dashboard"\) rerenderHrmsActiveView\(\)/);
  assert.doesNotMatch(submitSource, /attendance is .*saved in this browser/);
});

test("dashboard header remains balanced on small screens", () => {
  assert.match(html, /@media \(max-width: 600px\)[\s\S]*\.page-actions\.is-dashboard-page \.dashboard-location-action\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
});
