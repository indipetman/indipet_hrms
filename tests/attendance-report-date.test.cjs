const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const dateFilter = require("../attendance-report-date.cjs");
const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(__dirname, "..", "server.mjs"), "utf8");

test("attendance report normalizes system and display dates to ISO", () => {
  assert.equal(dateFilter.normalize("2026-08-07"), "2026-08-07");
  assert.equal(dateFilter.normalize("07/08/2026"), "2026-08-07");
  assert.equal(dateFilter.normalize("2026-08-07T12:30:00Z"), "2026-08-07");
  assert.equal(dateFilter.normalize("31/02/2026"), "");
});

test("attendance report date range is inclusive and rejects undated rows when bounded", () => {
  assert.equal(dateFilter.isWithinRange("01/08/2026", "2026-08-01", "2026-08-31"), true);
  assert.equal(dateFilter.isWithinRange("31/08/2026", "2026-08-01", "2026-08-31"), true);
  assert.equal(dateFilter.isWithinRange("01/09/2026", "2026-08-01", "2026-08-31"), false);
  assert.equal(dateFilter.isWithinRange("", "2026-08-01", "2026-08-31"), false);
  assert.equal(dateFilter.isWithinRange("", "", ""), true);
});

test("attendance report corrects a reversed range from the boundary the user changed", () => {
  assert.deepEqual(
    dateFilter.normalizeRange("2026-09-01", "2026-08-31", "start"),
    { start: "2026-09-01", end: "2026-09-01" }
  );
  assert.deepEqual(
    dateFilter.normalizeRange("2026-09-01", "2026-08-31", "end"),
    { start: "2026-08-31", end: "2026-08-31" }
  );
});

test("attendance report opens with the complete selected calendar month", () => {
  assert.deepEqual(
    dateFilter.monthRange(new Date(2026, 7, 7)),
    { start: "2026-08-01", end: "2026-08-31" }
  );
  assert.deepEqual(
    dateFilter.monthRange(new Date(2028, 1, 14)),
    { start: "2028-02-01", end: "2028-02-29" }
  );
});

test("Attendance Reports loads and uses the shared date-range helper", () => {
  assert.match(server, /url\.pathname === "\/attendance-report-date\.cjs"/);
  assert.match(html, /<script src="attendance-report-date\.cjs"><\/script>/);
  assert.match(html, /AttendanceReportDate\.normalize\(details\.work_date\)/);
  assert.match(html, /AttendanceReportDate\.isWithinRange\(entry\.workDate, filters\.start, filters\.end\)/);
  assert.match(html, /AttendanceReportDate\.monthRange\(referenceDate\)/);
  assert.match(html, /attendanceReportPeriodStorageKey = "indipet\.hrms\.attendanceReports\.period"/);
  assert.match(html, /writeAttendanceReportPeriod\(\)/);
  assert.match(html, /syncAttendanceReportDateRange\("start"\)/);
  assert.match(html, /syncAttendanceReportDateRange\("end"\)/);
});

test("Attendance Reports keeps both date pickers navigable across months", () => {
  const syncStart = html.indexOf("function syncAttendanceReportDateRange");
  const syncEnd = html.indexOf("function renderAttendanceReports", syncStart);
  const source = html.slice(syncStart, syncEnd);
  assert.doesNotMatch(source, /startInput\.max\s*=/);
  assert.doesNotMatch(source, /endInput\.min\s*=/);
  assert.match(source, /AttendanceReportDate\.normalizeRange\(startInput\.value, endInput\.value, changedBoundary\)/);
});
