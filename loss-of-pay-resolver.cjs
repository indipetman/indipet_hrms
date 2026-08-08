(function(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.HrmsLossOfPayResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function() {
  "use strict";

  const LEAVE_CODE = "LOP";
  const LEAVE_NAME = "Loss of Pay";
  const ACTIVE_WORKFLOWS = new Set(["PENDING_REVIEW", "APPROVED", "PAYROLL_APPLIED"]);
  const APPROVED_ATTENDANCE = new Set(["APPROVED", "AUTO_APPROVED", "OVERRIDDEN"]);
  const ABSENCE_STATUSES = new Set(["ABSENT", "NO SHOW"]);
  const CLOSED_ASSIGNMENTS = /WEEKLY[ -]?OFF|CLOSED HOLIDAY|HOLIDAY CLOSED/i;

  const array = value => Array.isArray(value) ? value : [];
  const text = value => String(value ?? "").trim();
  const upper = value => text(value).toUpperCase().replace(/[ -]+/g, "_");
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const roundUnits = value => Math.round(number(value) * 2) / 2;
  const normalizeDate = value => {
    const raw = text(value);
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return raw;
    match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
  };
  const expandDates = (startValue, endValue = startValue) => {
    const start = normalizeDate(startValue);
    const end = normalizeDate(endValue) || start;
    if (!start || !end || end < start) return [];
    const cursor = new Date(`${start}T00:00:00Z`);
    const limit = new Date(`${end}T00:00:00Z`);
    const dates = [];
    while (cursor <= limit && dates.length < 370) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  };
  const detailsOf = row => row?.details && typeof row.details === "object" ? row.details : {};
  const cellsOf = row => array(row?.cells);
  const sourceStatus = row => upper(detailsOf(row).lifecycle_status || detailsOf(row).decision_status || row?.status || cellsOf(row).at(-1));
  const employeeIdOf = row => text(detailsOf(row).employee_id || row?.employee_id || cellsOf(row)[2]);
  const employeeNameOf = row => text(detailsOf(row).employee_name || row?.employee_name || cellsOf(row)[1] || employeeIdOf(row));
  const sourceIdOf = row => text(detailsOf(row).request_id || detailsOf(row).record_id || row?.request_id || row?.record_id || row?.row_id || row?.id);
  const employeeDateKey = (employeeId, date) => `${text(employeeId)}|${normalizeDate(date)}`;
  const safe = value => text(value).replace(/[^A-Za-z0-9_-]/g, "-");
  const ledgerId = (employeeId, date) => `leave-ledger-lop-${safe(employeeId)}-${normalizeDate(date)}`;

  function nonWorkingKeys(snapshot = {}) {
    const keys = new Set();
    array(snapshot.rosters).forEach(roster => {
      array(roster.weekly_offs).forEach(item => {
        const employeeId = text(item.employee_id || item.employeeId || item.id);
        const date = normalizeDate(item.date || item.work_date);
        if (employeeId && date) keys.add(employeeDateKey(employeeId, date));
      });
      array(roster.assignments).forEach(item => {
        const employeeId = text(item.employee_id || item.employeeId || item.id);
        const date = normalizeDate(item.date || item.work_date);
        const assignment = text(item.assignment || item.shift || item.shift_name || item.status);
        if (employeeId && date && CLOSED_ASSIGNMENTS.test(assignment)) keys.add(employeeDateKey(employeeId, date));
      });
    });
    return keys;
  }

  function leaveRequestCandidates(snapshot = {}, closedKeys = nonWorkingKeys(snapshot)) {
    return array(snapshot.module_rows)
      .filter(row => text(row.pageKey || row.page_key) === "leave-requests")
      .flatMap(row => {
        const details = detailsOf(row);
        const code = upper(details.leave_code || details.leave_name || cellsOf(row)[2]);
        if (code !== LEAVE_CODE && code !== "LOSS_OF_PAY") return [];
        const workflow = sourceStatus(row);
        if (!["PENDING", "PENDING_REVIEW", "APPROVED", "PAYROLL_APPLIED"].includes(workflow)) return [];
        const employeeId = employeeIdOf(row);
        const sourceId = sourceIdOf(row);
        if (!employeeId || !sourceId) return [];
        const dates = expandDates(details.start_date || details.work_date || details.date, details.end_date || details.start_date || details.work_date || details.date);
        const units = upper(details.leave_portion) === "HALF_DAY" ? 0.5 : 1;
        return dates
          .filter(date => !closedKeys.has(employeeDateKey(employeeId, date)))
          .map(date => ({
            employee_id: employeeId,
            employee_name: employeeNameOf(row),
            organization_id: text(details.entity_id || details.organization_id || row.entity_id),
            location_id: text(details.location_id || row.location_id),
            location: text(details.location || row.location),
            work_date: date,
            units,
            workflow_status: workflow === "PAYROLL_APPLIED" ? "PAYROLL_APPLIED" : workflow === "APPROVED" ? "APPROVED" : "PENDING_REVIEW",
            source_type: "LEAVE_REQUEST",
            source_id: sourceId,
            source_priority: workflow === "PAYROLL_APPLIED" ? 50 : workflow === "APPROVED" ? 40 : 20
          }));
      });
  }

  function attendanceCandidates(snapshot = {}, closedKeys = nonWorkingKeys(snapshot)) {
    const moduleRows = array(snapshot.module_rows).filter(row => text(row.pageKey || row.page_key) === "attendance-list");
    const tableRows = array(snapshot.attendance).map(row => ({
      ...row,
      row_id: row.id,
      pageKey: "attendance-list",
      details: {
        ...detailsOf(row),
        record_id: row.id,
        employee_id: row.employee_id,
        employee_name: row.name,
        entity_id: row.entity_id,
        location_id: row.location_id,
        location: row.location,
        work_date: row.work_date,
        roster_shift: row.shift,
        final_status: row.status,
        decision_status: row.status,
        lifecycle_status: row.status
      }
    }));
    const byId = new Map();
    [...tableRows, ...moduleRows].forEach(row => {
      const id = sourceIdOf(row);
      if (id) byId.set(id, row);
    });
    return [...byId.values()].flatMap(row => {
      const details = detailsOf(row);
      const employeeId = employeeIdOf(row);
      const sourceId = sourceIdOf(row);
      const date = normalizeDate(details.work_date || row.work_date || cellsOf(row)[0]);
      const status = upper(details.final_status || details.calculated_day_status || details.proposed_status || row.status || cellsOf(row)[9]);
      const workflow = upper(details.lifecycle_status || details.decision_status || details.review_status || row.status);
      const rosterShift = text(details.original_roster_shift || details.roster_shift || row.shift || cellsOf(row)[4]);
      if (!employeeId || !sourceId || !date || !ABSENCE_STATUSES.has(status)) return [];
      if (!APPROVED_ATTENDANCE.has(workflow) && details.override_active !== true) return [];
      if (details.leave_assignment_active === true || details.leave_request_id || CLOSED_ASSIGNMENTS.test(rosterShift)) return [];
      if (closedKeys.has(employeeDateKey(employeeId, date))) return [];
      return [{
        employee_id: employeeId,
        employee_name: employeeNameOf(row),
        organization_id: text(details.entity_id || row.entity_id),
        location_id: text(details.location_id || row.location_id),
        location: text(details.location || row.location),
        work_date: date,
        units: 1,
        workflow_status: "APPROVED",
        source_type: "ATTENDANCE_ABSENCE",
        source_id: sourceId,
        source_priority: 30
      }];
    });
  }

  function attendancePenaltyCandidates(snapshot = {}) {
    return array(snapshot.attendance_penalty_transactions).flatMap(transaction => {
      const consequence = upper(transaction.consequence_type);
      const workflow = upper(transaction.workflow_status);
      const dates = array(transaction.source_dates).map(normalizeDate).filter(Boolean);
      const workDate = dates.at(-1) || normalizeDate(transaction.transaction_date);
      const units = roundUnits(transaction.units);
      if (consequence !== "LOSS_OF_PAY" || !["APPLIED", "PAYROLL_APPLIED"].includes(workflow)) return [];
      if (!text(transaction.transaction_id) || !text(transaction.employee_id) || !workDate || ![0.5, 1].includes(units)) return [];
      return [{
        employee_id: text(transaction.employee_id),
        employee_name: text(transaction.employee_name || transaction.employee_id),
        organization_id: text(transaction.entity_id),
        location_id: text(transaction.location_id),
        location: text(transaction.location),
        work_date: workDate,
        units,
        workflow_status: workflow === "PAYROLL_APPLIED" ? "PAYROLL_APPLIED" : "APPROVED",
        source_type: "ATTENDANCE_PENALTY",
        source_id: text(transaction.transaction_id),
        source_priority: 45
      }];
    });
  }

  function candidates(snapshot = {}) {
    const closedKeys = nonWorkingKeys(snapshot);
    const selected = new Map();
    [
      ...leaveRequestCandidates(snapshot, closedKeys),
      ...attendanceCandidates(snapshot, closedKeys),
      ...attendancePenaltyCandidates(snapshot)
    ].forEach(candidate => {
      const key = employeeDateKey(candidate.employee_id, candidate.work_date);
      const previous = selected.get(key);
      if (!previous || candidate.source_priority > previous.source_priority) selected.set(key, candidate);
    });
    return [...selected.values()];
  }

  function buildEntry(candidate = {}, existing = {}, now = new Date().toISOString()) {
    const workflow = candidate.workflow_status;
    const units = roundUnits(candidate.units);
    return {
      ...existing,
      ledger_id: text(existing.ledger_id) || ledgerId(candidate.employee_id, candidate.work_date),
      employee_id: candidate.employee_id,
      employee_name: candidate.employee_name,
      organization_id: candidate.organization_id,
      location_id: candidate.location_id,
      location: candidate.location,
      policy_id: "SYSTEM-LOP",
      leave_code: LEAVE_CODE,
      leave_name: LEAVE_NAME,
      opening_balance: 0,
      accrued_days: 0,
      used_days: workflow === "APPROVED" || workflow === "PAYROLL_APPLIED" ? units : 0,
      adjusted_days: 0,
      pending_days: workflow === "PENDING_REVIEW" ? units : 0,
      available_days: 0,
      units,
      transaction_date: candidate.work_date,
      as_of_date: candidate.work_date,
      status: workflow === "PAYROLL_APPLIED" ? "Payroll Applied" : workflow === "APPROVED" ? "Approved" : "Pending Review",
      source_type: candidate.source_type,
      source_id: candidate.source_id,
      pay_treatment: "LOSS_OF_PAY",
      workflow_status: workflow,
      payroll_period: text(existing.payroll_period),
      payroll_status: workflow === "PAYROLL_APPLIED" ? "APPLIED" : text(existing.payroll_status) || "PENDING",
      payroll_applied_at: workflow === "PAYROLL_APPLIED" ? text(existing.payroll_applied_at) : "",
      reversed_entry_id: text(existing.reversed_entry_id),
      created_at: text(existing.created_at) || now,
      updated_at: now,
      history: array(existing.history)
    };
  }

  function reconcileEntries(entries = [], snapshot = {}, options = {}) {
    const now = text(options.now) || new Date().toISOString();
    const existingEntries = array(entries);
    const nonLop = existingEntries.filter(entry => upper(entry.leave_code) !== LEAVE_CODE && upper(entry.pay_treatment) !== "LOSS_OF_PAY");
    const existingLop = existingEntries.filter(entry => upper(entry.leave_code) === LEAVE_CODE || upper(entry.pay_treatment) === "LOSS_OF_PAY");
    const immutable = existingLop.filter(entry => ["PAYROLL_APPLIED", "REVERSED"].includes(upper(entry.workflow_status || entry.status)));
    const existingByKey = new Map(existingLop.map(entry => [employeeDateKey(entry.employee_id, entry.transaction_date || entry.as_of_date), entry]));
    const immutableKeys = new Set(immutable.map(entry => employeeDateKey(entry.employee_id, entry.transaction_date || entry.as_of_date)));
    const generated = candidates(snapshot)
      .filter(candidate => !immutableKeys.has(employeeDateKey(candidate.employee_id, candidate.work_date)))
      .map(candidate => buildEntry(candidate, existingByKey.get(employeeDateKey(candidate.employee_id, candidate.work_date)) || {}, now));
    const next = [...nonLop, ...immutable, ...generated];
    return { entries: next, changed: JSON.stringify(next) !== JSON.stringify(existingEntries), candidates: generated.length };
  }

  function validateEntries(snapshot = {}) {
    const entries = array(snapshot.leave_ledger).filter(entry => upper(entry.leave_code) === LEAVE_CODE || upper(entry.pay_treatment) === "LOSS_OF_PAY");
    const candidateByKey = new Map(candidates(snapshot).map(candidate => [employeeDateKey(candidate.employee_id, candidate.work_date), candidate]));
    const employeeIds = new Set(array(snapshot.employees).map(employee => text(employee.employee_id)).filter(Boolean));
    const seen = new Set();
    const blockers = [];
    entries.forEach(entry => {
      const date = normalizeDate(entry.transaction_date || entry.as_of_date);
      const key = employeeDateKey(entry.employee_id, date);
      const workflow = upper(entry.workflow_status || entry.status);
      const units = roundUnits(entry.units || entry.used_days || entry.pending_days);
      if (!text(entry.employee_id) || !date) blockers.push({ record_id: text(entry.ledger_id), detail: "LOP requires an employee and transaction date." });
      if (seen.has(key) && workflow !== "REVERSED") blockers.push({ record_id: text(entry.ledger_id), detail: `Duplicate LOP exists for ${text(entry.employee_id)} on ${date}.` });
      if (workflow !== "REVERSED") seen.add(key);
      if (employeeIds.size && !employeeIds.has(text(entry.employee_id))) blockers.push({ record_id: text(entry.ledger_id), detail: `LOP employee ${text(entry.employee_id)} does not exist.` });
      if (![0.5, 1].includes(units)) blockers.push({ record_id: text(entry.ledger_id), detail: "LOP units must be 0.5 or 1 day." });
      if (!ACTIVE_WORKFLOWS.has(workflow) && workflow !== "REVERSED") blockers.push({ record_id: text(entry.ledger_id), detail: `Unsupported LOP workflow status ${workflow || "(blank)"}.` });
      if (workflow === "PAYROLL_APPLIED" && (!text(entry.payroll_period) || !text(entry.payroll_applied_at))) {
        blockers.push({ record_id: text(entry.ledger_id), detail: "Payroll-applied LOP requires payroll period and applied timestamp." });
      }
      if (!["PAYROLL_APPLIED", "REVERSED"].includes(workflow)) {
        const candidate = candidateByKey.get(key);
        if (!candidate || candidate.source_id !== text(entry.source_id)) {
          blockers.push({ record_id: text(entry.ledger_id), detail: `LOP source is missing or no longer valid for ${text(entry.employee_id)} on ${date}.` });
        }
      }
    });
    return blockers.length ? { ok: false, error: "Loss of Pay integrity validation failed.", blockers, table: "leave_ledger" } : { ok: true, blockers: [] };
  }

  function entryFor(entries = [], employeeId = "", date = "") {
    const key = employeeDateKey(employeeId, date);
    return array(entries).find(entry =>
      (upper(entry.leave_code) === LEAVE_CODE || upper(entry.pay_treatment) === "LOSS_OF_PAY")
      && upper(entry.workflow_status || entry.status) !== "REVERSED"
      && employeeDateKey(entry.employee_id, entry.transaction_date || entry.as_of_date) === key
    ) || null;
  }

  return Object.freeze({ LEAVE_CODE, LEAVE_NAME, expandDates, candidates, attendancePenaltyCandidates, reconcileEntries, validateEntries, entryFor });
});
