(function attachAttendanceExceptionResolver(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AttendanceExceptionResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAttendanceExceptionResolver() {
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

  function timingParts(timing = "") {
    const [start = "", end = ""] = text(timing).split(/\s+-\s+/);
    return { start, end };
  }

  function normalizeShift(shift = {}) {
    const timing = text(shift.timing || shift.shift_timing);
    const parts = timingParts(timing);
    const start = timeToMinutes(shift.shift_start_time || parts.start);
    let end = timeToMinutes(shift.shift_end_time || parts.end);
    if (start === null || end === null) return null;
    if (end <= start) end += 24 * 60;
    const netWorkMinutes = Math.max(
      0,
      Number(shift.shift_net_work_minutes || shift.net_work_minutes || 0)
      || Math.round(Number(shift.shift_net_work_hours || shift.net_work_hours || 0) * 60)
    );
    return {
      ...shift,
      shift_id: text(shift.shift_id || shift.policy_id || shift.id),
      shift_name: text(shift.shift_name || shift.policy_name || shift.name || "Shift"),
      timing: timing || `${parts.start} - ${parts.end}`,
      shift_start_minutes: start,
      shift_end_minutes: end,
      shift_net_work_minutes: netWorkMinutes,
      shift_net_work_hours: netWorkMinutes / 60
    };
  }

  function alignActualWindow(checkIn = "", checkOut = "", scheduledStart = 0) {
    let start = timeToMinutes(checkIn);
    let end = timeToMinutes(checkOut);
    if (start === null || end === null) return null;
    if (end <= start) end += 24 * 60;
    const alternatives = [
      { start, end },
      { start: start + 24 * 60, end: end + 24 * 60 },
      { start: start - 24 * 60, end: end - 24 * 60 }
    ];
    return alternatives.sort((left, right) =>
      Math.abs(left.start - scheduledStart) - Math.abs(right.start - scheduledStart)
    )[0];
  }

  function shiftDistance(shift = {}, checkIn = "", checkOut = "") {
    const normalized = normalizeShift(shift);
    if (!normalized) return Number.POSITIVE_INFINITY;
    const actual = alignActualWindow(checkIn, checkOut, normalized.shift_start_minutes);
    if (!actual) return Number.POSITIVE_INFINITY;
    return Math.abs(actual.start - normalized.shift_start_minutes)
      + Math.abs(actual.end - normalized.shift_end_minutes);
  }

  function suggestShift(shifts = [], checkIn = "", checkOut = "") {
    return (Array.isArray(shifts) ? shifts : [])
      .map(normalizeShift)
      .filter(Boolean)
      .map(shift => ({ shift, distance: shiftDistance(shift, checkIn, checkOut) }))
      .sort((left, right) => left.distance - right.distance || left.shift.shift_name.localeCompare(right.shift.shift_name))[0] || null;
  }

  function classify({ rosterAssignment = null, weeklyOff = null, shifts = [], checkIn = "", checkOut = "" } = {}) {
    const rosterShift = normalizeShift(rosterAssignment || {});
    const suggestion = suggestShift(shifts, checkIn, checkOut);
    const hasBothPunches = Boolean(checkIn) && Boolean(checkOut);
    let type = "NONE";
    let label = "None";

    if (hasBothPunches && weeklyOff) {
      type = "WEEKLY_OFF_WORK";
      label = "Weekly-Off Work";
    } else if (hasBothPunches && !rosterShift) {
      type = "UNSCHEDULED_WORK";
      label = "Unscheduled Work";
    } else if (hasBothPunches && rosterShift && suggestion?.shift?.shift_id
      && suggestion.shift.shift_id !== rosterShift.shift_id) {
      const rosterDistance = shiftDistance(rosterShift, checkIn, checkOut);
      const suggestionIsMateriallyCloser = suggestion.distance + 60 < rosterDistance;
      const suggestionIsPlausible = suggestion.distance <= 240;
      if (suggestionIsMateriallyCloser && suggestionIsPlausible) {
        type = "SHIFT_MISMATCH";
        label = "Shift Mismatch";
      }
    }

    return {
      type,
      label,
      requiresReview: type !== "NONE",
      originalShift: rosterShift,
      suggestedShift: type === "NONE" ? null : suggestion?.shift || null,
      suggestionDistanceMinutes: Number.isFinite(suggestion?.distance) ? suggestion.distance : null
    };
  }

  function isProperCompOffAttendance(candidate = {}) {
    if (text(candidate.exception_type).toUpperCase() !== "WEEKLY_OFF_WORK") return false;
    if (text(candidate.decision_status).toUpperCase() !== "APPROVED") return false;
    if (text(candidate.attendance_status).toUpperCase() !== "PRESENT") return false;
    if (!candidate.resolved_shift_id) return false;
    if ((Number(candidate.worked_minutes) || 0) < (Number(candidate.full_day_requirement_minutes) || 0)) return false;
    const incidents = Array.isArray(candidate.timing_incidents) ? candidate.timing_incidents : [];
    if (incidents.length) return false;
    const issue = text(candidate.attendance_issue).toUpperCase();
    return !issue || ["NONE", "WEEKLY-OFF WORK", "WEEKLY OFF WORK"].includes(issue);
  }

  return {
    classify,
    isProperCompOffAttendance,
    normalizeShift,
    shiftDistance,
    suggestShift,
    timeToMinutes
  };
});
