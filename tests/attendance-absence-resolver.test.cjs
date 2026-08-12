const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const resolver = require("../attendance-absence-resolver.cjs");

function publishedRoster(overrides = {}) {
  return {
    roster_id: "RST-1",
    location_id: "LOC-1",
    status: "Published",
    updated_at: "2026-08-07T08:00:00.000Z",
    assignments: [{
      employee_id: "EMP-1",
      employee_name: "Example Employee",
      date: "2026-08-07",
      shift_id: "SHIFT-1",
      timing: "09:00 AM - 05:00 PM",
      status: "Assigned"
    }],
    weekly_offs: [],
    leave_days: [],
    ...overrides
  };
}

test("a published scheduled shift with zero punches becomes an absence only after closure", () => {
  const beforeClosure = resolver.buildCandidates({
    rosters: [publishedRoster()],
    referenceAt: new Date(2026, 7, 7, 16, 59)
  });
  const afterClosure = resolver.buildCandidates({
    rosters: [publishedRoster()],
    referenceAt: new Date(2026, 7, 7, 17, 0)
  });
  assert.equal(beforeClosure.length, 0);
  assert.equal(afterClosure.length, 1);
  assert.equal(afterClosure[0].employee_id, "EMP-1");
  assert.equal(afterClosure[0].work_date, "2026-08-07");
});

test("weekly off, roster leave, approved leave and closed holiday are never auto-absent", () => {
  const referenceAt = new Date(2026, 7, 7, 18, 0);
  const weeklyOff = resolver.buildCandidates({
    rosters: [publishedRoster({ weekly_offs: [{ employee_id: "EMP-1", date: "2026-08-07" }] })],
    referenceAt
  });
  const rosterLeave = resolver.buildCandidates({
    rosters: [publishedRoster({ leave_days: [{ employee_id: "EMP-1", date: "2026-08-07" }] })],
    referenceAt
  });
  const approvedLeave = resolver.buildCandidates({
    rosters: [publishedRoster()],
    referenceAt,
    hasApprovedLeave: () => true
  });
  const closedHoliday = resolver.buildCandidates({
    rosters: [publishedRoster()],
    referenceAt,
    isClosedHoliday: () => true
  });
  assert.deepEqual(weeklyOff, []);
  assert.deepEqual(rosterLeave, []);
  assert.deepEqual(approvedLeave, []);
  assert.deepEqual(closedHoliday, []);
});

test("a retained rejected-leave audit link does not suppress absence", () => {
  const referenceAt = new Date(2026, 7, 7, 18, 0);
  const rejected = resolver.buildCandidates({
    rosters: [publishedRoster({
      leave_days: [{
        employee_id: "EMP-1",
        date: "2026-08-07",
        leave_request_id: "LR-1",
        decision_status: "Rejected",
        active: false
      }]
    })],
    referenceAt
  });
  const approved = resolver.buildCandidates({
    rosters: [publishedRoster({
      leave_days: [{
        employee_id: "EMP-1",
        date: "2026-08-07",
        leave_request_id: "LR-1",
        decision_status: "Approved",
        active: true
      }]
    })],
    referenceAt
  });
  assert.equal(rejected.length, 1);
  assert.equal(approved.length, 0);
});

test("existing attendance and inactive employees are not materialized again", () => {
  const referenceAt = new Date(2026, 7, 7, 18, 0);
  assert.deepEqual(resolver.buildCandidates({
    rosters: [publishedRoster()],
    referenceAt,
    existingKeys: ["EMP-1|2026-08-07"]
  }), []);
  assert.deepEqual(resolver.buildCandidates({
    rosters: [publishedRoster()],
    referenceAt,
    employeeIsActive: () => false
  }), []);
});

test("overnight shifts close on the following calendar day", () => {
  const roster = publishedRoster({
    assignments: [{
      employee_id: "EMP-1",
      date: "2026-08-07",
      shift_id: "NIGHT",
      timing: "06:30 PM - 02:30 AM",
      status: "Assigned"
    }]
  });
  assert.equal(resolver.buildCandidates({
    rosters: [roster],
    referenceAt: new Date(2026, 7, 8, 2, 29)
  }).length, 0);
  assert.equal(resolver.buildCandidates({
    rosters: [roster],
    referenceAt: new Date(2026, 7, 8, 2, 30)
  }).length, 1);
});

test("HRMS registers, persists and filters system-generated no-show absences", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
  const server = fs.readFileSync(path.join(__dirname, "..", "server.mjs"), "utf8");
  assert.match(html, /<script src="attendance-absence-resolver\.cjs"><\/script>/);
  assert.match(html, /function materializeClosedShiftAbsences/);
  assert.match(html, /capture_method:\s*"SYSTEM_AUTO_ABSENCE"/);
  assert.match(html, /lifecycle_status:\s*"APPROVED"/);
  assert.match(html, /materializedAbsenceCount.*persistHrmsReserve/s);
  assert.match(html, /<option value="No Show">No Show<\/option>/);
  assert.match(server, /\/attendance-absence-resolver\.cjs/);
});
