(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsFinancialYearIntegrity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const rows = value => Array.isArray(value) ? value : [];
  const dateValue = value => text(value).slice(0, 10);
  const isoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(dateValue(value));
  const parseList = value => {
    if (Array.isArray(value)) return value;
    if (!text(value)) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const details = record => record?.details && typeof record.details === "object" && !Array.isArray(record.details)
    ? record.details
    : {};
  const workflowPage = record => text(record?.pageKey || record?.page_key).toLowerCase();
  const recordKey = (tableName, record = {}) => text(
    record.id || record.roster_id || record.policy_id || record.ledger_id || record.holiday_id
    || record.transaction_id || record.counter_id || record.row_id || record.notification_id
  ) || `${tableName} record`;

  function financialYearForDate(organization = {}, value = "") {
    const date = dateValue(value);
    if (!isoDate(date)) return null;
    return rows(organization.financial_years).find(year =>
      isoDate(year.start_date)
      && isoDate(year.end_date)
      && dateValue(year.start_date) <= date
      && date <= dateValue(year.end_date)
    ) || null;
  }

  function scopedDates(tableName, record = {}) {
    if (tableName === "attendance") return [record.work_date];
    if (tableName === "rosters") return [record.start_date, record.end_date];
    if (tableName === "attendance_policies" || tableName === "leave_policies") return [record.created_at];
    if (tableName === "attendance_incident_counters") return [record.last_incident_date || record.created_at];
    if (tableName === "attendance_penalty_transactions") {
      const sourceDates = parseList(record.source_dates);
      return sourceDates.length ? sourceDates : [record.created_at];
    }
    if (tableName === "leave_ledger") return [record.transaction_date || record.as_of_date || record.created_at];
    if (tableName === "holiday_calendar") return [record.holiday_date];
    if (tableName === "module_rows") {
      const page = workflowPage(record);
      const value = details(record);
      if (page === "attendance-list") return [value.work_date || value.date];
      if (page === "leave-requests") return [value.start_date, value.end_date || value.start_date];
    }
    return [];
  }

  const scopedTables = Object.freeze([
    "attendance",
    "attendance_policies",
    "attendance_incident_counters",
    "attendance_penalty_transactions",
    "leave_policies",
    "leave_ledger",
    "holiday_calendar",
    "rosters",
    "module_rows"
  ]);

  function stampAndValidate(snapshot = {}, organization = {}) {
    const hasDateBoundRecords = scopedTables.some(tableName => rows(snapshot[tableName]).some(record =>
      tableName !== "module_rows" || ["attendance-list", "leave-requests"].includes(workflowPage(record))
    ));
    if (!hasDateBoundRecords) return { ok: true, snapshot, blockers: [], changed: false };
    const financialYears = rows(organization.financial_years);
    if (!financialYears.length) {
      return {
        ok: false,
        code: "FINANCIAL_YEAR_REQUIRED",
        table: "financial_years",
        blockers: [{ reason: "ERP Core has no Financial Year Master records" }],
        error: "HRMS save blocked because ERP Core has no Financial Year covering the transaction date."
      };
    }
    const next = { ...snapshot };
    const blockers = [];
    let changed = false;

    scopedTables.forEach(tableName => {
      next[tableName] = rows(snapshot[tableName]).map(record => {
        const dates = scopedDates(tableName, record).map(dateValue).filter(Boolean);
        if (!dates.length) {
          // Only workflow rows from a date-bound page require a year. Generic
          // department/designation rows in module_rows remain year-independent.
          if (tableName !== "module_rows" || ["attendance-list", "leave-requests"].includes(workflowPage(record))) {
            blockers.push({ table: tableName, record_id: recordKey(tableName, record), reason: "Transaction date is missing" });
          }
          return record;
        }
        const invalidDate = dates.find(date => !isoDate(date));
        if (invalidDate) {
          blockers.push({ table: tableName, record_id: recordKey(tableName, record), reason: `Invalid transaction date ${invalidDate}` });
          return record;
        }
        const years = dates.map(date => financialYearForDate(organization, date));
        const missingIndex = years.findIndex(year => !year);
        if (missingIndex >= 0) {
          blockers.push({
            table: tableName,
            record_id: recordKey(tableName, record),
            date: dates[missingIndex],
            reason: `No ERP Core Financial Year covers ${dates[missingIndex]}`
          });
          return record;
        }
        const yearIds = [...new Set(years.map(year => text(year.financial_year_id)))];
        if (yearIds.length !== 1) {
          blockers.push({
            table: tableName,
            record_id: recordKey(tableName, record),
            reason: `Transaction range crosses Financial Years ${yearIds.join(" and ")}; split it at the year boundary`
          });
          return record;
        }
        const expectedYearId = yearIds[0];
        const suppliedYearId = text(record.financial_year_id);
        if (suppliedYearId && suppliedYearId !== expectedYearId) {
          blockers.push({
            table: tableName,
            record_id: recordKey(tableName, record),
            reason: `Financial Year ${suppliedYearId} does not cover the transaction date; expected ${expectedYearId}`
          });
          return record;
        }
        let stamped = suppliedYearId ? record : { ...record, financial_year_id: expectedYearId };
        if (!suppliedYearId) changed = true;
        if (tableName === "module_rows") {
          const currentDetails = details(stamped);
          if (text(currentDetails.financial_year_id) && text(currentDetails.financial_year_id) !== expectedYearId) {
            blockers.push({
              table: tableName,
              record_id: recordKey(tableName, record),
              reason: `Workflow Financial Year ${text(currentDetails.financial_year_id)} does not match ${expectedYearId}`
            });
            return stamped;
          }
          if (!text(currentDetails.financial_year_id)) {
            stamped = { ...stamped, details: { ...currentDetails, financial_year_id: expectedYearId } };
            changed = true;
          }
        }
        return stamped;
      });
    });

    if (blockers.length) {
      return {
        ok: false,
        code: "FINANCIAL_YEAR_SCOPE_REJECTED",
        table: blockers[0].table,
        blockers,
        error: `HRMS save blocked by Financial Year integrity: ${blockers[0].reason}.`
      };
    }
    return { ok: true, snapshot: next, blockers: [], changed };
  }

  return Object.freeze({ financialYearForDate, scopedDates, scopedTables, stampAndValidate });
});
