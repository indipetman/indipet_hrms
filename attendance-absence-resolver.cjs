(function attachAttendanceAbsenceResolver(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AttendanceAbsenceResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAttendanceAbsenceResolver() {
  "use strict";

  const text = value => String(value ?? "").trim();

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

  function shiftTiming(assignment = {}, shift = {}) {
    const storedTiming = text(assignment.timing || assignment.shift_timing || shift.timing || shift.shift_timing);
    const [timingStart = "", timingEnd = ""] = storedTiming.split(/\s+-\s+/);
    return {
      timing: storedTiming,
      start: text(assignment.shift_start_time || shift.shift_start_time || timingStart),
      end: text(assignment.shift_end_time || shift.shift_end_time || timingEnd)
    };
  }

  function shiftClosureAt(workDate = "", assignment = {}, shift = {}) {
    const dateMatch = text(workDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timing = shiftTiming(assignment, shift);
    const startMinutes = timeToMinutes(timing.start);
    const endMinutes = timeToMinutes(timing.end);
    if (!dateMatch || startMinutes === null || endMinutes === null) return null;
    const closure = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), 0, 0, 0, 0);
    closure.setMinutes(endMinutes + (endMinutes <= startMinutes ? 24 * 60 : 0));
    return closure;
  }

  function buildCandidates({
    rosters = [],
    existingKeys = [],
    referenceAt = new Date(),
    employeeIsActive = () => true,
    hasApprovedLeave = () => false,
    isClosedHoliday = () => false,
    resolveShift = () => null
  } = {}) {
    const reference = referenceAt instanceof Date ? referenceAt : new Date(referenceAt);
    if (Number.isNaN(reference.getTime())) return [];
    const existing = new Set(existingKeys);
    const candidates = new Map();
    [...(Array.isArray(rosters) ? rosters : [])]
      .filter(roster => text(roster.status).toLowerCase() === "published")
      .sort((left, right) => (Date.parse(left.updated_at || left.updated || "") || 0) - (Date.parse(right.updated_at || right.updated || "") || 0))
      .forEach(roster => {
        const weeklyOffKeys = new Set((roster.weekly_offs || []).map(item => `${item.employee_id}|${item.date}`));
        const leaveKeys = new Set((roster.leave_days || [])
          .filter(item => {
            const decisionStatus = text(item.decision_status || item.status).toUpperCase();
            return item.active !== false && (!decisionStatus || decisionStatus === "APPROVED");
          })
          .map(item => `${item.employee_id}|${item.date}`));
        (roster.assignments || []).forEach(assignment => {
          if (text(assignment.status || "Assigned").toLowerCase() !== "assigned") return;
          const employeeId = text(assignment.employee_id);
          const workDate = text(assignment.date);
          const key = `${employeeId}|${workDate}`;
          if (!employeeId || !workDate || existing.has(key)) return;
          if (!employeeIsActive(employeeId, workDate, roster, assignment)) return;
          if (weeklyOffKeys.has(key) || leaveKeys.has(key)) return;
          if (hasApprovedLeave(employeeId, workDate, roster, assignment)) return;
          if (isClosedHoliday(workDate, roster, assignment)) return;
          const shift = resolveShift(roster, assignment) || {};
          const closure = shiftClosureAt(workDate, assignment, shift);
          if (!closure || reference.getTime() < closure.getTime()) return;
          candidates.set(key, {
            key,
            employee_id: employeeId,
            employee_name: assignment.employee_name || "",
            work_date: workDate,
            roster_id: roster.roster_id || "",
            location_id: roster.location_id || assignment.location_id || "",
            assignment: { ...assignment },
            shift: { ...shift },
            closure_at: closure.toISOString()
          });
        });
      });
    return [...candidates.values()];
  }

  return { buildCandidates, shiftClosureAt, shiftTiming, timeToMinutes };
});
