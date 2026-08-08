(function attachAttendancePolicyResolver(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AttendancePolicyResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAttendancePolicyResolver() {
  const specificityByType = Object.freeze({
    EMPLOYEE: 60,
    SHIFT: 50,
    DESIGNATION: 40,
    DEPARTMENT: 30,
    LOCATION: 20,
    ENTITY: 10
  });
  const fullCoverageTargets = new Set(["FULL_COVERAGE", "ALL_AUTHORIZED"]);

  const text = value => String(value ?? "").trim();
  const tokens = values => (Array.isArray(values) ? values : [values])
    .map(text)
    .filter(Boolean);

  function targetParts(value = "") {
    const stored = text(value);
    const separatorIndex = stored.indexOf("::");
    return separatorIndex < 0
      ? { entityId: "", target: stored }
      : { entityId: stored.slice(0, separatorIndex), target: stored.slice(separatorIndex + 2) };
  }

  function assignmentMatches(assignment = {}, employee = {}) {
    const type = text(assignment.target_type).toUpperCase();
    const storedTarget = text(assignment.target_key);
    if (type === "ENTITY" && fullCoverageTargets.has(storedTarget.toUpperCase())) {
      const assignmentOrganizationId = text(assignment.organization_id || assignment.tenant_id || assignment.entity_id);
      const employeeOrganizationId = text(employee.organizationId || employee.tenantId);
      return !assignmentOrganizationId || !employeeOrganizationId || assignmentOrganizationId === employeeOrganizationId;
    }
    const { entityId, target } = targetParts(storedTarget);
    const employeeEntityId = text(employee.entityId);
    if (entityId && entityId !== employeeEntityId) return false;
    const candidateValues = {
      ENTITY: [employeeEntityId],
      LOCATION: employee.locationValues,
      DEPARTMENT: employee.departmentValues,
      DESIGNATION: employee.designationValues,
      SHIFT: employee.shiftValues,
      EMPLOYEE: [employee.employeeId]
    };
    return tokens(candidateValues[type]).includes(target);
  }

  function assignmentSpecificity(assignment = {}, employee = {}) {
    if (!assignmentMatches(assignment, employee)) return -1;
    const type = text(assignment.target_type).toUpperCase();
    if (type === "ENTITY" && fullCoverageTargets.has(text(assignment.target_key).toUpperCase())) return 0;
    return specificityByType[type] ?? 0;
  }

  function safeMinutes(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
  }

  function assignmentNetWorkMinutes(assignment = {}) {
    const minuteValues = [
      assignment.net_work_minutes,
      assignment.shift_net_work_minutes,
      assignment.netWorkMinutes
    ];
    for (const value of minuteValues) {
      const minutes = Number(value);
      if (Number.isFinite(minutes) && minutes > 0) return Math.round(minutes);
    }
    const hourValues = [
      assignment.net_work_hours,
      assignment.shift_net_work_hours,
      assignment.netWorkHours
    ];
    for (const value of hourValues) {
      const hours = Number(value);
      if (Number.isFinite(hours) && hours > 0) return Math.round(hours * 60);
    }
    const timing = timingParts(assignment.timing || assignment.shift_timing || "");
    const start = timeToMinutes(
      assignment.shift_start_time
      || assignment.start_time
      || assignment.shiftStartTime
      || timing.start
    );
    let end = timeToMinutes(
      assignment.shift_end_time
      || assignment.end_time
      || assignment.shiftEndTime
      || timing.end
    );
    if (start === null || end === null) return 0;
    if (end <= start) end += 24 * 60;
    const breakValues = [
      assignment.shift_break_duration_minutes,
      assignment.break_duration_minutes,
      assignment.break_minutes,
      assignment.breakDurationMinutes
    ];
    if (!breakValues.some(value => value !== undefined && value !== null && value !== "")) return 0;
    const breakMinutes = safeMinutes(breakValues.find(value => value !== undefined && value !== null && value !== ""));
    return Math.max(0, end - start - breakMinutes);
  }

  function resolvePolicy({ policies = [], assignments = [], employee = {} } = {}) {
    const candidates = (Array.isArray(policies) ? policies : []).flatMap(policy => {
      if (text(policy?.status).toLowerCase() !== "active") return [];
      const policyId = text(policy?.policy_id);
      const policyAssignments = (Array.isArray(assignments) ? assignments : [])
        .filter(assignment => text(assignment?.policy_id) === policyId);
      const included = policyAssignments.filter(assignment => text(assignment.assignment_mode).toUpperCase() === "INCLUDE");
      const excluded = policyAssignments.filter(assignment => text(assignment.assignment_mode).toUpperCase() === "EXCLUDE");
      if (!included.length || excluded.some(assignment => assignmentMatches(assignment, employee))) return [];
      const specificity = Math.max(...included.map(assignment => assignmentSpecificity(assignment, employee)));
      if (specificity < 0) return [];
      return [{
        policy,
        specificity,
        updatedAt: Date.parse(policy.updated_at || policy.created_at || "") || 0
      }];
    }).sort((left, right) =>
      right.specificity - left.specificity
      || right.updatedAt - left.updatedAt
      || text(left.policy.policy_code || left.policy.policy_id).localeCompare(text(right.policy.policy_code || right.policy.policy_id))
    );
    const selected = candidates[0] || null;
    const rules = selected?.policy?.rules && typeof selected.policy.rules === "object" ? selected.policy.rules : {};
    const minimumHalfDayMinutes = safeMinutes(
      rules.minimum_half_day_minutes
      ?? rules.half_day_threshold_minutes
      ?? rules.absent_threshold_minutes
    );
    return {
      policy: selected?.policy || null,
      specificity: selected?.specificity ?? -1,
      lateArrivalGraceMinutes: safeMinutes(rules.late_arrival_grace_minutes),
      earlyExitGraceMinutes: safeMinutes(rules.early_exit_grace_minutes),
      minimumHalfDayMinutes,
      halfDayThresholdMinutes: minimumHalfDayMinutes,
      absentThresholdMinutes: minimumHalfDayMinutes,
      overtimeThresholdMinutes: selected ? safeMinutes(rules.overtime_threshold_minutes ?? 30) : 0
    };
  }

  function timeToMinutes(value = "") {
    const match = text(value).match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3]?.toUpperCase();
    if (minute > 59 || hour > (period ? 12 : 23) || hour < (period ? 1 : 0)) return null;
    if (period === "AM" && hour === 12) hour = 0;
    if (period === "PM" && hour < 12) hour += 12;
    return hour * 60 + minute;
  }

  function timingParts(timing = "") {
    const [start = "", end = ""] = text(timing).split(/\s+-\s+/);
    return { start, end };
  }

  function statusForIssue(issue = "None", checkIn = "", checkOut = "") {
    if (Boolean(checkIn) !== Boolean(checkOut)) return "Missing Punch";
    if (!checkIn && !checkOut) return "Waiting for punch evidence";
    if (issue === "Late Arrival") return "Late";
    if (issue === "Early Exit") return "Early Exit";
    if (issue === "Late / Early Exit") return "Late / Early Exit";
    if (issue === "Half Day Working Hours") return "Half Day";
    if (issue === "Below Half-Day Minimum") return "Absent";
    if (issue === "Overtime") return "Overtime";
    return "Present";
  }

  function timingIssueLabel(incidents = []) {
    return incidents.length ? incidents.join(" / ") : "None";
  }

  function evaluatePunches({ assignment = null, checkIn = "", checkOut = "", resolution = {} } = {}) {
    const policyApplied = Boolean(resolution.policy);
    const timingIncidents = [];
    let issue = "None";
    let dayStatus = "Waiting for punch evidence";
    let workedMinutes = 0;
    let scheduledDurationMinutes = 0;
    let fullDayRequirementMinutes = assignmentNetWorkMinutes(assignment || {});
    let fullDayQualifiedBy = "";
    let requiresReview = false;
    let autoApprovalEligible = false;

    if (Boolean(checkIn) !== Boolean(checkOut)) {
      issue = "Missing Punch";
      dayStatus = "Missing Punch";
      timingIncidents.push("Missing Punch");
      requiresReview = true;
    } else if (!checkIn && !checkOut) {
      dayStatus = "Waiting for punch evidence";
    } else if (!assignment) {
      issue = "Roster Mismatch";
      dayStatus = "Pending Configuration";
      requiresReview = true;
    } else if (!policyApplied) {
      issue = "Attendance Policy Missing";
      dayStatus = "Pending Configuration";
      requiresReview = true;
    } else if (!assignment.timing) {
      issue = "Shift Timing Missing";
      dayStatus = "Pending Configuration";
      requiresReview = true;
    } else if (!fullDayRequirementMinutes) {
      issue = "Shift Net Work Hours Missing";
      dayStatus = "Pending Configuration";
      requiresReview = true;
    } else {
      const scheduled = timingParts(assignment.timing);
      const scheduledStart = timeToMinutes(scheduled.start);
      let scheduledEnd = timeToMinutes(scheduled.end);
      const actualStart = timeToMinutes(checkIn);
      let actualEnd = timeToMinutes(checkOut);
      if ([scheduledStart, scheduledEnd, actualStart, actualEnd].some(value => value === null)) {
        issue = "Invalid Punch or Shift Time";
        dayStatus = "Pending Configuration";
        requiresReview = true;
      } else {
        if (scheduledEnd <= scheduledStart) scheduledEnd += 24 * 60;
        if (actualEnd <= actualStart) actualEnd += 24 * 60;
        workedMinutes = Math.max(0, actualEnd - actualStart);
        const minimumHalfDayMinutes = safeMinutes(
          resolution.minimumHalfDayMinutes
          ?? resolution.halfDayThresholdMinutes
          ?? resolution.absentThresholdMinutes
        );
        const overtimeThresholdMinutes = safeMinutes(resolution.overtimeThresholdMinutes);
        const lateGraceMinutes = safeMinutes(resolution.lateArrivalGraceMinutes);
        const earlyGraceMinutes = safeMinutes(resolution.earlyExitGraceMinutes);
        scheduledDurationMinutes = Math.max(0, scheduledEnd - scheduledStart);
        if (minimumHalfDayMinutes > 0 && minimumHalfDayMinutes >= fullDayRequirementMinutes) {
          issue = "Attendance Threshold Configuration Invalid";
          dayStatus = "Pending Configuration";
          requiresReview = true;
        } else {
          const late = actualStart > scheduledStart + lateGraceMinutes;
          const early = actualEnd < scheduledEnd - earlyGraceMinutes;
          const overtime = actualEnd > scheduledEnd + overtimeThresholdMinutes;
          if (late) timingIncidents.push("Late Arrival");
          if (early) timingIncidents.push("Early Exit");
          if (overtime) timingIncidents.push("Overtime");

          const withinPermittedBoundaries = !late && !early;
          if (minimumHalfDayMinutes > 0 && workedMinutes < minimumHalfDayMinutes) {
            dayStatus = "Absent";
          } else if (workedMinutes >= fullDayRequirementMinutes) {
            dayStatus = "Present";
            fullDayQualifiedBy = "SHIFT_NET_WORK_HOURS";
          } else if (withinPermittedBoundaries) {
            dayStatus = "Present";
            fullDayQualifiedBy = "PERMITTED_GRACE_WINDOWS";
          } else {
            dayStatus = "Half Day";
          }
          issue = timingIssueLabel(timingIncidents);
          autoApprovalEligible = true;
        }
      }
    }
    return {
      issue,
      status: dayStatus,
      dayStatus,
      timingIncidents,
      requiresReview,
      autoApprovalEligible,
      policy: resolution.policy || null,
      policyApplied,
      lateArrivalGraceMinutes: safeMinutes(resolution.lateArrivalGraceMinutes),
      earlyExitGraceMinutes: safeMinutes(resolution.earlyExitGraceMinutes),
      minimumHalfDayMinutes: safeMinutes(
        resolution.minimumHalfDayMinutes
        ?? resolution.halfDayThresholdMinutes
        ?? resolution.absentThresholdMinutes
      ),
      halfDayThresholdMinutes: safeMinutes(
        resolution.minimumHalfDayMinutes
        ?? resolution.halfDayThresholdMinutes
        ?? resolution.absentThresholdMinutes
      ),
      absentThresholdMinutes: safeMinutes(
        resolution.minimumHalfDayMinutes
        ?? resolution.halfDayThresholdMinutes
        ?? resolution.absentThresholdMinutes
      ),
      fullDayRequirementMinutes,
      shiftNetWorkMinutes: fullDayRequirementMinutes,
      fullDayQualifiedBy,
      scheduledDurationMinutes,
      workedMinutes,
      overtimeThresholdMinutes: safeMinutes(resolution.overtimeThresholdMinutes)
    };
  }

  return {
    assignmentMatches,
    assignmentNetWorkMinutes,
    assignmentSpecificity,
    evaluatePunches,
    resolvePolicy,
    statusForIssue,
    timeToMinutes
  };
});
