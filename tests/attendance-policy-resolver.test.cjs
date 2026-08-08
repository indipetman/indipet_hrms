const assert = require("node:assert/strict");
const test = require("node:test");

const AttendancePolicyResolver = require("../attendance-policy-resolver.cjs");

const employee = {
  employeeId: "E1533",
  organizationId: "INDIPET_ROOT",
  entityId: "SOU0001",
  locationValues: ["FRN001"],
  departmentValues: ["RETAIL"],
  designationValues: ["EXECUTIVE"],
  shiftValues: ["CLOSING"]
};

const activePolicy = (overrides = {}) => ({
  policy_id: "ATP-1",
  policy_code: "ATP0001",
  status: "Active",
  version: 1,
  updated_at: "2026-08-03T10:00:00.000Z",
  rules: {
    late_arrival_grace_minutes: 10,
    early_exit_grace_minutes: 5,
    minimum_half_day_minutes: 0,
    half_day_threshold_minutes: 0,
    absent_threshold_minutes: 0,
    overtime_threshold_minutes: 30
  },
  ...overrides
});

test("Full Coverage applies grace to a covered employee", () => {
  const resolution = AttendancePolicyResolver.resolvePolicy({
    policies: [activePolicy()],
    assignments: [{ policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "ENTITY", target_key: "FULL_COVERAGE", organization_id: "INDIPET_ROOT" }],
    employee
  });
  assert.equal(resolution.policy.policy_code, "ATP0001");
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "12:30 PM - 09:30 PM", shift_net_work_minutes: 480 },
    checkIn: "12:39 PM",
    checkOut: "09:26 PM",
    resolution
  });
  assert.equal(assessment.issue, "None");
  assert.equal(assessment.status, "Present");
});

test("a covered employee beyond Full Coverage grace remains late", () => {
  const resolution = AttendancePolicyResolver.resolvePolicy({
    policies: [activePolicy()],
    assignments: [{ policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "ENTITY", target_key: "FULL_COVERAGE", organization_id: "INDIPET_ROOT" }],
    employee
  });
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "12:30 PM - 09:30 PM", shift_net_work_minutes: 480 },
    checkIn: "12:42 PM",
    checkOut: "09:30 PM",
    resolution
  });
  assert.equal(assessment.policyApplied, true);
  assert.equal(assessment.issue, "Late Arrival");
  assert.equal(assessment.status, "Present");
  assert.deepEqual(assessment.timingIncidents, ["Late Arrival"]);
});

test("an employee exclusion overrides Full Coverage", () => {
  const resolution = AttendancePolicyResolver.resolvePolicy({
    policies: [activePolicy()],
    assignments: [
      { policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "ENTITY", target_key: "FULL_COVERAGE" },
      { policy_id: "ATP-1", assignment_mode: "EXCLUDE", target_type: "EMPLOYEE", target_key: "E1533" }
    ],
    employee
  });
  assert.equal(resolution.policy, null);
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "12:30 PM - 09:30 PM", shift_net_work_minutes: 480 },
    checkIn: "12:42 PM",
    checkOut: "09:32 PM",
    resolution
  });
  assert.equal(assessment.policyApplied, false);
  assert.equal(assessment.issue, "Attendance Policy Missing");
  assert.equal(assessment.status, "Pending Configuration");
});

test("zero-minute grace applies only when a zero-grace policy actually matches", () => {
  const policy = activePolicy({ rules: { late_arrival_grace_minutes: 0, early_exit_grace_minutes: 0 } });
  const resolution = AttendancePolicyResolver.resolvePolicy({
    policies: [policy],
    assignments: [{ policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "EMPLOYEE", target_key: "E1533" }],
    employee
  });
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "12:30 PM - 09:30 PM", shift_net_work_minutes: 480 },
    checkIn: "12:31 PM",
    checkOut: "09:30 PM",
    resolution
  });
  assert.equal(assessment.policyApplied, true);
  assert.equal(assessment.issue, "Late Arrival");
  assert.equal(assessment.status, "Present");
});

test("the most specific matching active policy wins", () => {
  const policies = [
    activePolicy(),
    activePolicy({
      policy_id: "ATP-2",
      policy_code: "ATP0002",
      rules: { late_arrival_grace_minutes: 15, early_exit_grace_minutes: 8 }
    })
  ];
  const assignments = [
    { policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "ENTITY", target_key: "FULL_COVERAGE" },
    { policy_id: "ATP-2", assignment_mode: "INCLUDE", target_type: "EMPLOYEE", target_key: "E1533" }
  ];
  const resolution = AttendancePolicyResolver.resolvePolicy({ policies, assignments, employee });
  assert.equal(resolution.policy.policy_code, "ATP0002");
  assert.equal(resolution.lateArrivalGraceMinutes, 15);
});

test("late arrival and early exit can be detected together", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "10:30 AM - 07:30 PM", shift_net_work_minutes: 480 },
    checkIn: "10:41 AM",
    checkOut: "07:24 PM",
    resolution: { policy: activePolicy(), lateArrivalGraceMinutes: 10, earlyExitGraceMinutes: 5 }
  });
  assert.equal(assessment.issue, "Late Arrival / Early Exit");
  assert.equal(assessment.status, "Present");
  assert.deepEqual(assessment.timingIncidents, ["Late Arrival", "Early Exit"]);
});

test("inactive policies are ignored and overnight shifts are calculated correctly", () => {
  const resolution = AttendancePolicyResolver.resolvePolicy({
    policies: [activePolicy({ status: "Inactive" })],
    assignments: [{ policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "ENTITY", target_key: "FULL_COVERAGE" }],
    employee
  });
  assert.equal(resolution.policy, null);
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "10:00 PM - 06:00 AM", shift_net_work_minutes: 480 },
    checkIn: "10:00 PM",
    checkOut: "05:59 AM",
    resolution: { policy: activePolicy(), earlyExitGraceMinutes: 1 }
  });
  assert.equal(assessment.issue, "None");
});

test("working the five-hour minimum becomes Half Day until full-day hours are completed", () => {
  const resolution = AttendancePolicyResolver.resolvePolicy({
    policies: [activePolicy({
      rules: {
        late_arrival_grace_minutes: 10,
        early_exit_grace_minutes: 5,
        minimum_half_day_minutes: 300,
        overtime_threshold_minutes: 30
      }
    })],
    assignments: [{ policy_id: "ATP-1", assignment_mode: "INCLUDE", target_type: "EMPLOYEE", target_key: "E1533" }],
    employee
  });
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "09:00 AM - 06:00 PM", shift_net_work_minutes: 480 },
    checkIn: "09:00 AM",
    checkOut: "02:00 PM",
    resolution
  });
  assert.equal(assessment.issue, "Early Exit");
  assert.equal(assessment.status, "Half Day");
  assert.equal(assessment.minimumHalfDayMinutes, 300);
  assert.equal(assessment.fullDayRequirementMinutes, 480);
});

test("working below the five-hour minimum becomes Absent", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "09:00 AM - 06:00 PM", shift_net_work_minutes: 480 },
    checkIn: "09:00 AM",
    checkOut: "01:59 PM",
    resolution: {
      policy: activePolicy(),
      minimumHalfDayMinutes: 300,
      overtimeThresholdMinutes: 30
    }
  });
  assert.equal(assessment.issue, "Early Exit");
  assert.equal(assessment.status, "Absent");
  assert.equal(assessment.minimumHalfDayMinutes, 300);
});

test("five hours ten minutes on a nine-hour roster becomes Half Day", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "01:00 PM - 10:00 PM", shift_net_work_minutes: 480 },
    checkIn: "01:00 PM",
    checkOut: "06:10 PM",
    resolution: {
      policy: activePolicy(),
      minimumHalfDayMinutes: 300,
      lateArrivalGraceMinutes: 10,
      earlyExitGraceMinutes: 5,
      overtimeThresholdMinutes: 30
    }
  });
  assert.equal(assessment.issue, "Early Exit");
  assert.equal(assessment.status, "Half Day");
});

test("overtime uses the policy threshold and is disabled when no policy applies", () => {
  const assignment = { timing: "09:00 AM - 06:00 PM", shift_net_work_minutes: 480 };
  const belowThreshold = AttendancePolicyResolver.evaluatePunches({
    assignment,
    checkIn: "09:00 AM",
    checkOut: "06:30 PM",
    resolution: { policy: activePolicy(), overtimeThresholdMinutes: 30 }
  });
  const aboveThreshold = AttendancePolicyResolver.evaluatePunches({
    assignment,
    checkIn: "09:00 AM",
    checkOut: "06:31 PM",
    resolution: { policy: activePolicy(), overtimeThresholdMinutes: 30 }
  });
  const noPolicy = AttendancePolicyResolver.evaluatePunches({
    assignment,
    checkIn: "09:00 AM",
    checkOut: "07:00 PM",
    resolution: {}
  });
  assert.equal(belowThreshold.issue, "None");
  assert.equal(aboveThreshold.issue, "Overtime");
  assert.equal(aboveThreshold.status, "Present");
  assert.equal(noPolicy.issue, "Attendance Policy Missing");
});

test("Shift Master net work hours determine full day without subtracting grace from the shift span", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "01:00 PM - 10:00 PM", shift_net_work_hours: 8 },
    checkIn: "01:00 PM",
    checkOut: "09:00 PM",
    resolution: {
      policy: activePolicy(),
      minimumHalfDayMinutes: 300,
      lateArrivalGraceMinutes: 10,
      earlyExitGraceMinutes: 5
    }
  });
  assert.equal(assessment.fullDayRequirementMinutes, 480);
  assert.equal(assessment.dayStatus, "Present");
  assert.equal(assessment.issue, "Early Exit");
  assert.equal(assessment.fullDayQualifiedBy, "SHIFT_NET_WORK_HOURS");
});

test("an exit inside early-exit grace can complete a full day even a few minutes below net hours", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "09:00 AM - 05:00 PM", shift_net_work_minutes: 480 },
    checkIn: "09:00 AM",
    checkOut: "04:57 PM",
    resolution: {
      policy: activePolicy(),
      minimumHalfDayMinutes: 300,
      earlyExitGraceMinutes: 5
    }
  });
  assert.equal(assessment.workedMinutes, 477);
  assert.equal(assessment.dayStatus, "Present");
  assert.equal(assessment.issue, "None");
  assert.equal(assessment.fullDayQualifiedBy, "PERMITTED_GRACE_WINDOWS");
});

test("a configured policy without Shift Master net hours remains pending configuration", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "09:00 AM - 05:00 PM" },
    checkIn: "09:00 AM",
    checkOut: "05:00 PM",
    resolution: { policy: activePolicy(), minimumHalfDayMinutes: 300 }
  });
  assert.equal(assessment.dayStatus, "Pending Configuration");
  assert.equal(assessment.issue, "Shift Net Work Hours Missing");
  assert.equal(assessment.requiresReview, true);
});

test("Shift Master net hours are derived from timing and break when persisted totals are missing", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: {
      timing: "01:30 PM - 10:00 PM",
      shift_start_time: "13:30",
      shift_end_time: "22:00",
      shift_break_duration_minutes: 60,
      shift_net_work_minutes: 0,
      shift_net_work_hours: 0
    },
    checkIn: "12:00 PM",
    checkOut: "10:00 PM",
    resolution: { policy: activePolicy(), minimumHalfDayMinutes: 300 }
  });
  assert.equal(assessment.fullDayRequirementMinutes, 450);
  assert.equal(assessment.dayStatus, "Present");
  assert.equal(assessment.issue, "None");
  assert.equal(assessment.requiresReview, false);
});

test("overnight Shift Master net hours are derived across midnight", () => {
  assert.equal(AttendancePolicyResolver.assignmentNetWorkMinutes({
    timing: "06:30 PM - 02:30 AM",
    break_duration_minutes: 60
  }), 420);
});

test("a half-day minimum that reaches the Shift Master full-day requirement is rejected", () => {
  const assessment = AttendancePolicyResolver.evaluatePunches({
    assignment: { timing: "09:00 AM - 05:00 PM", shift_net_work_minutes: 240 },
    checkIn: "09:00 AM",
    checkOut: "05:00 PM",
    resolution: { policy: activePolicy(), minimumHalfDayMinutes: 300 }
  });
  assert.equal(assessment.dayStatus, "Pending Configuration");
  assert.equal(assessment.issue, "Attendance Threshold Configuration Invalid");
  assert.equal(assessment.requiresReview, true);
  assert.equal(assessment.autoApprovalEligible, false);
});
