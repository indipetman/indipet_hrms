(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LeaveLedgerCoResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const WEEKLY_OFF_HOLIDAY_PREFIX = "leave-ledger-co-weekly-off-holiday-";
  const WEEKLY_OFF_WORK_PREFIX = "leave-ledger-co-weekly-off-work-";
  const LEGACY_CO_PREFIX = "leave-ledger-migrated-co-ledger-";
  const HOLIDAY_WORK_MINIMUM_MINUTES = 240;

  function safeId(value = "") {
    return String(value || "unknown").replace(/[^A-Za-z0-9_-]/g, "-");
  }

  function weeklyOffHolidayCreditId(candidate = {}) {
    return `${WEEKLY_OFF_HOLIDAY_PREFIX}${safeId(candidate.employee_id)}-${safeId(candidate.date)}-${safeId(candidate.holiday_id)}`;
  }

  function candidateCreditId(candidate = {}) {
    return String(candidate.source_type || "").toUpperCase() === "WEEKLY_OFF_WORK"
      ? `${WEEKLY_OFF_WORK_PREFIX}${safeId(candidate.employee_id)}-${safeId(candidate.date)}-${safeId(candidate.attendance_id || candidate.roster_id)}`
      : weeklyOffHolidayCreditId(candidate);
  }

  function isProperWorkAttendance(candidate = {}) {
    const sourceType = String(candidate.source_type || "").toUpperCase();
    if (!["HOLIDAY_WORK", "WEEKLY_OFF_WORK"].includes(sourceType)) return true;
    if ((Number(candidate.worked_minutes) || 0) < HOLIDAY_WORK_MINIMUM_MINUTES) return false;
    if ((Number(candidate.full_day_requirement_minutes) || 0) > 0
      && (Number(candidate.worked_minutes) || 0) < Number(candidate.full_day_requirement_minutes)) return false;
    if (String(candidate.attendance_status || "").trim().toUpperCase() !== "PRESENT") return false;
    const issue = String(candidate.attendance_issue || "").trim().toUpperCase();
    if (issue && issue !== "NONE") return false;
    return !Array.isArray(candidate.timing_incidents) || candidate.timing_incidents.length === 0;
  }

  function isLegacyHolidayWorkPlaceholder(entry = {}) {
    if (!String(entry.ledger_id || "").startsWith(LEGACY_CO_PREFIX)) return false;
    if (String(entry.leave_code || "").toUpperCase() !== "CO") return false;
    if ((Number(entry.available_days) || 0) !== 0 || (Number(entry.pending_days) || 0) <= 0) return false;
    return (Array.isArray(entry.history) ? entry.history : []).some(item =>
      String(item.action || "").includes("Migrated from CO Ledger")
      && String(item.detail || "").includes("Holiday Work")
    );
  }

  function creditRecord(candidate = {}, existing = null, now = new Date().toISOString()) {
    const ledgerId = candidateCreditId(candidate);
    const sourceType = String(candidate.source_type || "").toUpperCase();
    const isHolidayWork = sourceType === "HOLIDAY_WORK";
    const isWeeklyOffWork = sourceType === "WEEKLY_OFF_WORK";
    const history = existing && Array.isArray(existing.history)
      ? [...existing.history]
      : [{
          action: "Compensatory off credited automatically",
          detail: isWeeklyOffWork
            ? `Approved full attendance on scheduled weekly off ${candidate.date || "the roster date"} earned one Compensatory Off day.`
            : isHolidayWork
            ? `${candidate.holiday_name || "Declared holiday"} attendance was approved after ${Number(candidate.worked_minutes) || 0} worked minutes on ${candidate.date || "the holiday"}.`
            : candidate.weekly_off_basis === "ORGANIZATION_CLOSED_DAY"
              ? `${candidate.holiday_name || "Declared holiday"} fell on the organization weekly closed day on ${candidate.date || "the roster date"}; one Compensatory Off day was credited regardless of holiday Store Status or Holiday Work CO setting.`
              : `${candidate.holiday_name || "Declared holiday"} matched the employee's scheduled weekly off on ${candidate.date || "the roster date"}; one Compensatory Off day was credited regardless of holiday Store Status or Holiday Work CO setting.`,
          at: now,
          source_key: `${candidate.employee_id || ""}|${candidate.date || ""}|${candidate.holiday_id || ""}`
        }];
    return {
      ...(existing || {}),
      ledger_id: ledgerId,
      employee_id: candidate.employee_id || "",
      employee_name: candidate.employee_name || candidate.employee_id || "",
      organization_id: candidate.organization_id || "",
      location_id: candidate.location_id || "",
      location: candidate.location || "",
      policy_id: "",
      leave_code: "CO",
      leave_name: "Compensatory Off",
      opening_balance: 0,
      accrued_days: 0,
      used_days: 0,
      adjusted_days: 0,
      pending_days: 0,
      available_days: 1,
      transaction_date: candidate.date || "",
      as_of_date: candidate.date || "",
      status: "Credited",
      source_type: isWeeklyOffWork ? "WEEKLY_OFF_WORK" : isHolidayWork ? "HOLIDAY_WORK" : "WEEKLY_OFF_HOLIDAY",
      source_id: isWeeklyOffWork || isHolidayWork ? candidate.attendance_id || "" : candidate.roster_id || "",
      holiday_id: candidate.holiday_id || "",
      history
    };
  }

  function reconcileEntries(entries = [], candidates = [], options = {}) {
    const now = options.now || new Date().toISOString();
    const previous = JSON.stringify(entries);
    const isGenerated = entry => [WEEKLY_OFF_HOLIDAY_PREFIX, WEEKLY_OFF_WORK_PREFIX]
      .some(prefix => String(entry.ledger_id || "").startsWith(prefix));
    const existingGenerated = new Map(entries
      .filter(isGenerated)
      .map(entry => [`${entry.employee_id || ""}|${entry.transaction_date || entry.as_of_date || ""}`, entry]));
    const preserved = entries.filter(entry =>
      !isGenerated(entry)
      && !isLegacyHolidayWorkPlaceholder(entry)
    );
    const uniqueCandidates = new Map();
    candidates.forEach(candidate => {
      if (!candidate?.employee_id || !candidate?.date) return;
      const sourceType = String(candidate.source_type || "").toUpperCase();
      if (sourceType !== "WEEKLY_OFF_WORK" && !candidate.holiday_id) return;
      if (!isProperWorkAttendance(candidate)) return;
      const businessKey = `${candidate.employee_id}|${candidate.date}`;
      const current = uniqueCandidates.get(businessKey);
      if (!current || sourceType === "WEEKLY_OFF_HOLIDAY") uniqueCandidates.set(businessKey, candidate);
    });
    const credits = [...uniqueCandidates.entries()].map(([businessKey, candidate]) =>
      creditRecord(candidate, existingGenerated.get(businessKey) || null, now)
    );
    const nextEntries = [...preserved, ...credits];
    return {
      entries: nextEntries,
      changed: previous !== JSON.stringify(nextEntries),
      credited: credits.length,
      removed: Math.max(0, entries.length + credits.length - nextEntries.length)
    };
  }

  return {
    WEEKLY_OFF_HOLIDAY_PREFIX,
    WEEKLY_OFF_WORK_PREFIX,
    HOLIDAY_WORK_MINIMUM_MINUTES,
    weeklyOffHolidayCreditId,
    candidateCreditId,
    isProperHolidayWorkAttendance: isProperWorkAttendance,
    isProperWorkAttendance,
    isLegacyHolidayWorkPlaceholder,
    reconcileEntries
  };
});
