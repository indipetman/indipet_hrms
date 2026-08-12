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
  assert.deepEqual(
    dateFilter.monthRange(new Date(2026, 5, 14)),
    { start: "2026-06-01", end: "2026-06-30" }
  );
});

test("attendance report expands an inclusive period to every calendar date", () => {
  assert.deepEqual(
    dateFilter.datesInRange("2026-06-01", "2026-06-30"),
    Array.from({ length: 30 }, (_, index) => `2026-06-${String(index + 1).padStart(2, "0")}`)
  );
  assert.deepEqual(dateFilter.datesInRange("2028-02-28", "2028-03-01"), [
    "2028-02-28",
    "2028-02-29",
    "2028-03-01"
  ]);
  assert.deepEqual(dateFilter.datesInRange("", "2026-06-30"), []);
});

test("attendance report orders each month from day 1 through its final day", () => {
  const entries = [
    { workDate: "2026-06-30", employee: "Tarak", employeeId: "E2" },
    { workDate: "2026-06-01", employee: "Tarak", employeeId: "E2" },
    { workDate: "2026-06-01", employee: "Ayan", employeeId: "E1" },
    { workDate: "2026-06-29", employee: "Arpita", employeeId: "E3" }
  ];
  assert.deepEqual(
    entries.sort(dateFilter.compareEntriesChronologically).map(entry => `${entry.workDate}|${entry.employee}`),
    ["2026-06-01|Ayan", "2026-06-01|Tarak", "2026-06-29|Arpita", "2026-06-30|Tarak"]
  );
});

test("Attendance Reports loads and uses the shared date-range helper", () => {
  assert.match(server, /url\.pathname === "\/attendance-report-date\.cjs"/);
  assert.match(html, /<script src="attendance-report-date\.cjs"><\/script>/);
  assert.match(html, /AttendanceReportDate\.normalize\(details\.work_date\)/);
  assert.match(html, /AttendanceReportDate\.isWithinRange\(entry\.workDate, filters\.start, filters\.end\)/);
  assert.match(html, /AttendanceReportDate\.monthRange\(referenceDate\)/);
  assert.match(html, /AttendanceReportDate\.datesInRange\(filters\.start, filters\.end\)/);
  assert.match(html, /\.sort\(AttendanceReportDate\.compareEntriesChronologically\)/);
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
