const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const attendanceFiltersSource = html.slice(
  html.indexOf("function configureAttendanceRegisterFilters"),
  html.indexOf("function renderAttendanceRegisterPagination")
);
const rosterFiltersSource = html.slice(
  html.indexOf("function ensureRosterFilters"),
  html.indexOf("function filteredRosterOverviewRecordsForExport")
);

test("Attendence Register provides roster-style search and filters", () => {
  assert.match(html, /id="moduleSearch" type="search" placeholder="Employee, ID, shift or issue"/);
  assert.match(html, /id="attendanceWorkDate" type="date"/);
  assert.match(html, /<label for="attendanceWorkDate">Work Date<\/label>/);
  assert.doesNotMatch(attendanceFiltersSource, /attendancePeriodStart|attendancePeriodEnd|Attendance Period/);
  assert.match(html, /id="attendanceIssueFilter"/);
  assert.match(html, /id="attendanceResetButton"/);
  assert.doesNotMatch(html, /id="attendanceFilterButton"/);
  assert.match(attendanceFiltersSource, /attendanceResetButton"\)\.addEventListener\("click"[\s\S]*moduleSearch"\)\.value = ""[\s\S]*attendanceWorkDate"\)\.value = defaultWorkDate[\s\S]*attendanceIssueFilter"\)\.value = "all"/);
  assert.match(attendanceFiltersSource, /class="icon-button module-filter-icon" id="attendanceResetButton"/);
  assert.match(attendanceFiltersSource, /id="moduleBulkDelete"[\s\S]*?data-lucide="trash-2"/);
  assert.match(attendanceFiltersSource, /class="attendance-register-filter-actions">[\s\S]*?id="attendanceResetButton"[\s\S]*?id="moduleBulkDelete"[\s\S]*?<\/div>/);
  assert.match(html, /\.attendance-register-filter-actions \{[\s\S]*?display: flex;[\s\S]*?justify-content: flex-end;[\s\S]*?min-width: 100px;/);
  assert.match(rosterFiltersSource, /class="button roster-reset-button" id="rosterResetButton"/);
  assert.doesNotMatch(rosterFiltersSource, /id="rosterFilterButton"|id="moduleReset"/);
});

test("Attendence Register opens on the current date", () => {
  assert.match(html, /function defaultAttendanceRegisterDate\(referenceDate = new Date\(\)\)/);
  assert.match(html, /return isoDateValue\(referenceDate\)/);
  assert.match(html, /ensureAttendanceDateProjection\(selectedAttendanceWorkDate\)/);
});

test("Attendence Register filters live and paginates horizontally", () => {
  assert.match(html, /attendanceSearchDebounceTimer\s*=\s*setTimeout\([\s\S]*?180\);/);
  assert.match(html, /attendanceRowMatchesWorkDate\(row, attendanceWorkDate\)/);
  assert.match(html, /attendanceRowMatchesIssue\(row, attendanceIssue\)/);
  assert.match(html, /class="page-button is-current attendance-page-indicator"/);
  assert.match(html, /data-attendance-page-size/);
});

test("Attendence Register column organizer persists visibility and order", () => {
  assert.match(html, /attendanceRegisterColumnStorageKey = "indipet\.hrms\.attendanceRegister\.columns"/);
  assert.match(html, /id="attendanceColumnOrganizerPanel"/);
  assert.match(html, /data-attendance-column-visible=/);
  assert.match(html, /data-attendance-column-move=/);
  assert.match(html, /\{ key: "employee", label: "Employee", rowIndex: 1, locked: true \}/);
  assert.match(html, /writeHrmsJsonStorage\(attendanceRegisterColumnStorageKey, attendanceRegisterColumnLayout\)/);
  assert.match(html, /attendanceRegisterColumnLayout = defaultAttendanceRegisterColumnLayout\(\)/);
  assert.match(html, /const attendanceTableColumns = isAttendanceRegister \? visibleAttendanceRegisterColumns\(\) : \[\]/);
  assert.match(html, /attendanceTableColumns\.map\(column => `<td>\$\{attendanceRegisterColumnCell\(row, column\)\}<\/td>`\)/);
});

test("Attendance Register distinguishes the published roster from the approved attendance shift", () => {
  assert.match(html, /columns: \["Date", "Employee", "Employee ID", "Location", "Roster Shift", "Attendance Shift"/);
  assert.match(html, /\{ key: "attendance_shift", label: "Attendance Shift", derived: "attendance_shift" \}/);
  assert.match(html, /column\.derived === "attendance_shift"/);
  assert.match(html, /details\.resolved_shift_name/);
  assert.match(html, /details\.resolved_shift_timing/);
  assert.match(html, /details\.roster_shift \|\| row\[4\] \|\| "Not scheduled"/);
});

test("Attendance Register hides the page-level Export action", () => {
  assert.match(
    html,
    /exportButton\.hidden = \["leave-policy", "attendance-policy", "attendance-list", "roster"\]\.includes\(currentPage\) \|\| !canExport;/
  );
});
