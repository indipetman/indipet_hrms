const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const attendanceReportExportSource = html.slice(
  html.indexOf("function attendanceReportExportDataset"),
  html.indexOf("function getEntitySummaryValues")
);

test("Attendance Reports is a single filtered table without report tabs", () => {
  assert.match(html, /labels: \["Employees Covered", "Present Days", "Timing Issues", "Leave \/ Absence", "Pending Review"\]/);
  assert.match(html, /Attendance Report Records/);
  assert.match(html, /id="attendanceReportTable"/);
  assert.doesNotMatch(html, /data-attendance-report-tab|id="attendanceReportTabs"/);
});

test("Attendance Reports keeps primary filters in one stretched row and reveals status filters on demand", () => {
  for (const id of [
    "attendanceReportSearch",
    "attendanceReportStart",
    "attendanceReportEnd",
    "attendanceReportEntity",
    "attendanceReportLocation",
    "attendanceReportStatus",
    "attendanceReportIssue",
    "attendanceReportFilterButton"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /class="attendance-report-primary-filters"/);
  assert.match(html, /class="attendance-report-advanced-filters" id="attendanceReportAdvancedFilters"/);
  assert.match(html, /attendanceReportAdvancedFilters"[\s\S]*attendanceReportStatus[\s\S]*attendanceReportIssue/);
  assert.match(html, /attendance-report-primary-filters[\s\S]*grid-template-columns/);
  assert.match(html, /advancedFilters\.classList\.toggle\("is-open", open\)/);
  assert.match(html, /setAttribute\("aria-expanded", String\(open\)\)/);
  assert.match(html, /attendanceReportSearch"\)\.addEventListener\("input"/);
});

test("Attendance Reports uses scoped persisted attendance and excludes projections", () => {
  assert.match(html, /new Set\(hrmsScopedModuleRows\("attendance-list"\)\)/);
  assert.match(html, /if \(source\.projection_only === true\) return null/);
  assert.match(html, /registeredEntityRecordsForOperations\(\)/);
  assert.match(html, /registeredSubLocationsForOperations\(\)/);
});

test("Attendance Reports exports every filtered record and only visible columns", () => {
  assert.match(html, /function runAttendanceReportExport/);
  assert.match(html, /const entries = filteredAttendanceReportEntries\(\)/);
  assert.match(attendanceReportExportSource, /const columns = visibleAttendanceReportColumns\(\)/);
  assert.match(attendanceReportExportSource, /headers: columns\.map\(column => column\.label\)/);
  assert.match(attendanceReportExportSource, /rows: entries\.map\(entry => columns\.map\(column => entry\[column\.property\] \?\? ""\)\)/);
  assert.match(attendanceReportExportSource, /headers: dataset\.headers/);
  assert.match(attendanceReportExportSource, /widths: dataset\.columns\.map\(column => column\.pdfWidth \|\| 65\)/);
  assert.doesNotMatch(attendanceReportExportSource, /headers: \[\.\.\.pageConfig\["attendance-reports"\]\.columns\]/);
  assert.match(html, /exportRosterDatasetExcel\(dataset, attendanceReportExportFileName\("xlsx"\)/);
  assert.match(html, /exportRosterDatasetPdf\(dataset/);
  assert.match(html, /Export Excel/);
  assert.match(html, /Export PDF/);
});

test("Attendance Reports shows the approved attendance shift without replacing the published roster", () => {
  assert.match(html, /columns: \["Date", "Employee", "Employee ID", "Company", "Location", "Roster Shift", "Attendance Shift"/);
  assert.match(html, /\{ key: "attendance_shift", label: "Attendance Shift", property: "attendanceShift"/);
  assert.match(html, /rosterShift: String\(details\.original_roster_shift \|\| details\.roster_shift \|\| row\[4\] \|\| "Not scheduled"\)/);
  assert.match(html, /attendanceShift: String\(details\.resolved_shift_name \|\| ""\)\.trim\(\)/);
  assert.match(html, /entry\.rosterShift, entry\.attendanceShift, entry\.issue/);
});

test("Attendance report pagination keeps current and total pages side by side", () => {
  assert.match(html, /attendance-page-indicator[^>]*>[\s\S]*\$\{attendanceReportPage\} \/ \$\{totalPages\}/);
  assert.match(html, /attendanceReportFilteredEntries\.slice/);
  assert.match(html, /attendanceReportPageSize/);
});

test("Attendance Reports has a persistent functional column organizer", () => {
  assert.match(html, /id="attendanceReportColumnButton"/);
  assert.match(html, /id="attendanceReportColumnOrganizerPanel"/);
  assert.match(html, /attendanceReportColumnStorageKey = "indipet\.hrms\.attendanceReports\.columns"/);
  assert.match(html, /data-attendance-report-column-visible=/);
  assert.match(html, /data-attendance-report-column-move=/);
  assert.match(html, /\{ key: "employee", label: "Employee", property: "employee", locked: true/);
  assert.match(html, /writeHrmsJsonStorage\(attendanceReportColumnStorageKey, attendanceReportColumnLayout\)/);
  assert.match(html, /attendanceReportColumnLayout = defaultAttendanceReportColumnLayout\(\)/);
  assert.match(html, /next\.splice\(previousIndex \+ 1, 0, \{ key: definition\.key, visible: true \}\)/);
  assert.match(html, /const reportColumns = visibleAttendanceReportColumns\(\)/);
  assert.match(html, /reportColumns\.map\(column => `<td class="\$\{column\.className \|\| ""\}">\$\{attendanceReportColumnCell\(entry, column\)\}<\/td>`\)/);
});

test("column organizers stay inside the viewport and scroll only their item list", () => {
  assert.match(html, /\.entity-column-organizer-panel \{[\s\S]*?max-height: min\(490px, calc\(100vh - 96px\)\)[\s\S]*?display: flex[\s\S]*?overflow: hidden/);
  assert.match(html, /\.entity-column-list \{[\s\S]*?min-height: 0[\s\S]*?overflow-y: auto[\s\S]*?overscroll-behavior: contain/);
});

test("switching away from Attendance Reports rebuilds the generic module shell", () => {
  assert.match(html, /const genericModuleShellSelectors = \[[\s\S]*"#moduleTableHead"[\s\S]*"#moduleTableBody"[\s\S]*"#moduleCount"/);
  assert.match(html, /function genericModuleShellReady\(module\)/);
  assert.match(html, /if \(!genericModuleShellReady\(module\)\) \{[\s\S]*module\.innerHTML/);
});
