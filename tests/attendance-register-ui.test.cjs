const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("Attendence Register keeps the agreed five summary cards", () => {
  assert.match(html, /labels:\s*\["Scheduled \/ Total Employee", "Present", "Timing Issues", "On Leave", "Absent \/ Missing Punch"\]/);
  assert.match(html, /summaryFilters:\s*\["scheduled", "present", "late", "leave", "absent"\]/);
  assert.match(html, /class="card summary-card standard-summary-card attendance-summary-card/);
  assert.match(html, /function attendanceRowIsRosterScheduled/);
  assert.match(html, /const totalEmployees = new Set\(rows\.map/);
  assert.match(html, /rows\.filter\(attendanceRowIsRosterScheduled\)\.map/);
  assert.match(html, /`\$\{scheduledEmployees\} \/ \$\{totalEmployees\}`/);
  assert.match(html, /"weekly off"[\s\S]*"closed holiday"[\s\S]*"not scheduled"[\s\S]*"no published roster"/);
});

test("Timing Issues card explains its affected-employee count", () => {
  assert.match(html, /function attendanceTimingIssueSummary/);
  assert.match(html, /affectedEmployees.*attendanceRowHasTimingIssue/);
  assert.match(html, /function attendanceRowHasTimingIssue/);
  assert.match(html, /\$\{affectedEmployees\} employee/);
  assert.match(html, /\$\{lateArrivals\} late/);
  assert.match(html, /\$\{earlyExits\} early/);
  assert.match(html, /config\.notes\[2\] = attendanceTimingIssueSummary\(rowsWithoutStatus\)/);
});

test("Attendence Register cards drive the status filter without renaming the permission key", () => {
  assert.match(html, /layerCode:\s*"ATTENDANCE_LIST"/);
  assert.match(html, /data-attendance-summary-filter=/);
  assert.ok(html.includes('$("#moduleStatus").value = attendanceSummaryButton.dataset.attendanceSummaryFilter || "all";'));
});
