const assert = require("node:assert/strict");
const test = require("node:test");

const resolver = require("../attendance-exception-resolver.cjs");

const shifts = [
  {
    shift_id: "MORNING",
    shift_name: "Morning Shift",
    timing: "09:30 AM - 06:30 PM",
    shift_net_work_minutes: 480
  },
  {
    shift_id: "EVENING",
    shift_name: "Evening Shift",
    timing: "01:30 PM - 10:00 PM",
    shift_net_work_minutes: 450
  }
];

test("weekly-off punches become a reviewable weekly-off-work exception with a suggested shift", () => {
  const result = resolver.classify({
    weeklyOff: { employee_id: "EMP-1", date: "2026-08-09" },
    shifts,
    checkIn: "13:30",
    checkOut: "22:00"
  });
  assert.equal(result.type, "WEEKLY_OFF_WORK");
  assert.equal(result.label, "Weekly-Off Work");
  assert.equal(result.requiresReview, true);
  assert.equal(result.suggestedShift.shift_id, "EVENING");
});

test("an unscheduled employee is not silently attached to the suggested shift", () => {
  const result = resolver.classify({ shifts, checkIn: "09:25", checkOut: "18:30" });
  assert.equal(result.type, "UNSCHEDULED_WORK");
  assert.equal(result.suggestedShift.shift_id, "MORNING");
  assert.equal(result.originalShift, null);
});

test("punches materially closer to another shift are classified as a shift mismatch", () => {
  const result = resolver.classify({
    rosterAssignment: shifts[0],
    shifts,
    checkIn: "13:30",
    checkOut: "22:00"
  });
  assert.equal(result.type, "SHIFT_MISMATCH");
  assert.equal(result.suggestedShift.shift_id, "EVENING");
});

test("small timing variance remains an attendance-policy incident rather than a shift mismatch", () => {
  const result = resolver.classify({
    rosterAssignment: shifts[0],
    shifts,
    checkIn: "10:00",
    checkOut: "18:30"
  });
  assert.equal(result.type, "NONE");
  assert.equal(result.requiresReview, false);
});

test("weekly-off Comp Off requires approved full clean attendance against a confirmed shift", () => {
  const valid = {
    exception_type: "WEEKLY_OFF_WORK",
    decision_status: "APPROVED",
    attendance_status: "Present",
    attendance_issue: "None",
    timing_incidents: [],
    worked_minutes: 480,
    full_day_requirement_minutes: 480,
    resolved_shift_id: "MORNING"
  };
  assert.equal(resolver.isProperCompOffAttendance(valid), true);
  [
    { decision_status: "PENDING" },
    { attendance_status: "Half Day" },
    { attendance_issue: "Late Arrival" },
    { timing_incidents: ["Early Exit"] },
    { worked_minutes: 479 },
    { resolved_shift_id: "" }
  ].forEach(change => assert.equal(resolver.isProperCompOffAttendance({ ...valid, ...change }), false));
});
