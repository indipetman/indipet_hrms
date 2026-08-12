(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsLeaveCapResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const APPROVED = new Set(["APPROVED", "AUTO APPROVED", "AUTO-APPROVED"]);
  const FULL_DAY = "FULL_DAY";
  const FIRST_HALF = "FIRST_HALF";
  const SECOND_HALF = "SECOND_HALF";

  const text = value => String(value ?? "").trim();
  const upper = value => text(value).toUpperCase();
  const safeArray = value => Array.isArray(value) ? value : [];

  function detailsFor(row = {}) {
    return row && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {};
  }

  function cellsFor(row = {}) {
    return safeArray(row.cells);
  }

  function normalizeDate(value = "") {
    const raw = text(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const display = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (display) return `${display[3]}-${display[2]}-${display[1]}`;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateRangeFromLabel(label = "") {
    const raw = text(label);
    const iso = raw.match(/\d{4}-\d{2}-\d{2}/g) || [];
    if (iso.length) return { start: iso[0], end: iso[iso.length - 1] };
    const display = raw.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if (display.length) return { start: normalizeDate(display[0]), end: normalizeDate(display[display.length - 1]) };
    const single = normalizeDate(raw);
    return single ? { start: single, end: single } : { start: "", end: "" };
  }

  function expandDates(start, end) {
    const startIso = normalizeDate(start);
    const endIso = normalizeDate(end || start);
    if (!startIso || !endIso || endIso < startIso) return [];
    const result = [];
    const cursor = new Date(`${startIso}T00:00:00Z`);
    const last = new Date(`${endIso}T00:00:00Z`);
    while (cursor <= last && result.length < 367) {
      result.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return result;
  }

  function normalizePortion(value = "") {
    const normalized = upper(value).replace(/[\s-]+/g, "_");
    if (["FIRST_HALF", "FIRSTHALF", "AM", "H1"].includes(normalized)) return FIRST_HALF;
    if (["SECOND_HALF", "SECONDHALF", "PM", "H2"].includes(normalized)) return SECOND_HALF;
    return FULL_DAY;
  }

  function portionInterval(portion = FULL_DAY) {
    const value = normalizePortion(portion);
    if (value === FIRST_HALF) return [0, 720];
    if (value === SECOND_HALF) return [720, 1440];
    return [0, 1440];
  }

  function normalizeRequest(row = {}) {
    const details = detailsFor(row);
    const cells = cellsFor(row);
    const range = dateRangeFromLabel(cells[3]);
    const startDate = normalizeDate(details.start_date || details.from_date || details.leave_start_date || range.start);
    const endDate = normalizeDate(details.end_date || details.to_date || details.leave_end_date || range.end || startDate);
    return {
      source: row,
      request_id: text(details.request_id || row.request_id || row.row_id || cells[0]),
      employee_id: text(details.employee_id || row.employee_id),
      employee_name: text(details.employee_name || cells[1]),
      location_id: text(details.location_id || row.location_id),
      shift_id: text(details.shift_id || row.shift_id),
      start_date: startDate,
      end_date: endDate || startDate,
      portion: normalizePortion(details.leave_portion || details.portion || details.day_portion),
      status: upper(details.decision_status || details.status || row.status || cells[4]),
      leave_name: text(details.leave_name || cells[2] || "Leave")
    };
  }

  function leaveRequests(snapshot = {}) {
    return safeArray(snapshot.module_rows)
      .filter(row => text(row.pageKey || row.page_key) === "leave-requests")
      .map(normalizeRequest)
      .filter(request => request.request_id || request.employee_id);
  }

  function employeeRecord(snapshot = {}, employeeId = "", employeeName = "") {
    const normalizedName = upper(employeeName);
    return safeArray(snapshot.employees).find(employee => {
      const record = employee && typeof employee.record === "object" ? employee.record : {};
      const idMatched = employeeId && text(employee.employee_id || record.employee_id || record.id) === text(employeeId);
      const nameMatched = !employeeId && normalizedName
        && upper(employee.employee_name || record.employee_name || record.name) === normalizedName;
      return idMatched || nameMatched;
    }) || null;
  }

  function employeeDetails(employee = {}) {
    return employee && typeof employee.record === "object" ? employee.record : {};
  }

  function rosterForDate(snapshot = {}, locationId = "", date = "") {
    return safeArray(snapshot.rosters)
      .filter(roster => !locationId || text(roster.location_id) === text(locationId))
      .filter(roster => {
        const start = normalizeDate(roster.start_date) || dateRangeFromLabel(roster.period).start;
        const end = normalizeDate(roster.end_date) || dateRangeFromLabel(roster.period).end;
        return start && end && date >= start && date <= end;
      })
      .sort((left, right) => {
        const published = Number(upper(right.status) === "PUBLISHED") - Number(upper(left.status) === "PUBLISHED");
        if (published) return published;
        return (Number(right.version) || 0) - (Number(left.version) || 0);
      })[0] || null;
  }

  function resolveShift(snapshot = {}, request = {}, date = "") {
    const employee = employeeRecord(snapshot, request.employee_id, request.employee_name);
    const record = employeeDetails(employee);
    const locationId = text(request.location_id || record.location_id || employee?.location_id || record.locationId);
    const roster = rosterForDate(snapshot, locationId, date);
    const resolvedEmployeeId = text(request.employee_id || employee?.employee_id || record.employee_id || record.id);
    const assignment = safeArray(roster?.assignments).find(item =>
      text(item.employee_id) === resolvedEmployeeId
      && normalizeDate(item.date) === date
      && upper(item.status || "Assigned") === "ASSIGNED"
    );
    const shiftId = text(request.shift_id || assignment?.shift_id || record.default_shift_id || record.shift_id);
    return { shift_id: shiftId, location_id: locationId, roster_id: text(roster?.roster_id), employee_id: resolvedEmployeeId, assignment };
  }

  function activePolicy(snapshot = {}, locationId = "", shiftId = "") {
    return safeArray(snapshot.shift_policies).find(policy =>
      text(policy.location_id) === text(locationId)
      && text(policy.policy_id) === text(shiftId)
      && upper(policy.policy_status || policy.status || "Active") === "ACTIVE"
    ) || safeArray(snapshot.shift_policies).find(policy =>
      text(policy.location_id) === text(locationId)
      && text(policy.policy_name) === text(shiftId)
      && upper(policy.policy_status || policy.status || "Active") === "ACTIVE"
    ) || null;
  }

  function approvedEvents(snapshot = {}) {
    const events = [];
    leaveRequests(snapshot).filter(request => APPROVED.has(request.status)).forEach(request => {
      expandDates(request.start_date, request.end_date).forEach(date => {
        const resolution = resolveShift(snapshot, request, date);
        const policy = activePolicy(snapshot, resolution.location_id, resolution.shift_id);
        const cap = Number(policy?.max_leave_per_day);
        events.push({
          ...request,
          ...resolution,
          date,
          interval: portionInterval(request.portion),
          policy_id: text(policy?.policy_id),
          cap: Number.isInteger(cap) && cap >= 0 ? cap : null
        });
      });
    });
    return events;
  }

  function maximumConcurrent(events = []) {
    const points = [];
    events.forEach(event => {
      points.push([event.interval[0], 1]);
      points.push([event.interval[1], -1]);
    });
    points.sort((left, right) => left[0] - right[0] || left[1] - right[1]);
    let current = 0;
    let maximum = 0;
    points.forEach(([, delta]) => {
      current += delta;
      maximum = Math.max(maximum, current);
    });
    return maximum;
  }

  function approvedLeaveCapDeferrals(snapshot = {}) {
    return approvedEvents(snapshot)
      .filter(event => event.location_id && !event.shift_id)
      .map(event => ({
        type: "Daily Leave Limit",
        status: "Deferred Until Roster",
        request_id: event.request_id,
        employee_id: event.employee_id,
        date: event.date,
        location_id: event.location_id,
        shift_id: "",
        detail: `${event.employee_name || event.employee_id} has no rostered or default shift on ${event.date}; the shift/day leave-cap check is deferred until roster planning.`
      }));
  }

  function approvedLeaveCapViolations(snapshot = {}) {
    const events = approvedEvents(snapshot);
    const blockers = [];
    events.filter(event => !event.location_id || (event.shift_id && event.cap === null)).forEach(event => {
      blockers.push({
        type: "Daily Leave Limit",
        status: "Blocked",
        request_id: event.request_id,
        employee_id: event.employee_id,
        date: event.date,
        location_id: event.location_id,
        shift_id: event.shift_id,
        detail: !event.location_id
          ? `${event.employee_name || event.employee_id} has no assigned location on ${event.date}; leave approval cannot resolve its operating scope.`
          : `No active Excel-backed shift policy could resolve the leave limit for ${event.date}.`
      });
    });
    const grouped = new Map();
    events.filter(event => event.shift_id && event.location_id && event.cap !== null).forEach(event => {
      const key = `${event.location_id}|${event.shift_id}|${event.date}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(event);
    });
    grouped.forEach(group => {
      const cap = group[0].cap;
      const concurrent = maximumConcurrent(group);
      if (concurrent <= cap) return;
      blockers.push({
        type: "Daily Leave Limit",
        status: "Blocked",
        date: group[0].date,
        location_id: group[0].location_id,
        shift_id: group[0].shift_id,
        policy_id: group[0].policy_id,
        cap,
        approved_count: concurrent,
        request_ids: group.map(event => event.request_id),
        employee_ids: group.map(event => event.employee_id),
        detail: `${concurrent} overlapping approved leave requests exceed the shift/day limit of ${cap}.`
      });
    });
    return blockers;
  }

  function validateApprovedLeaveCaps(snapshot = {}) {
    const blockers = approvedLeaveCapViolations(snapshot);
    const deferred = approvedLeaveCapDeferrals(snapshot);
    return blockers.length
      ? { ok: false, error: "Approved leave exceeds or cannot resolve the Excel-backed shift/day leave limit.", blockers, deferred, table: "module_rows" }
      : { ok: true, blockers: [], deferred };
  }

  function evaluateApproval(snapshot = {}, candidate = {}) {
    const normalizedCandidate = {
      ...candidate,
      pageKey: "leave-requests",
      status: "Approved",
      details: { ...(candidate.details || {}), status: "Approved", decision_status: "Approved" }
    };
    const rows = safeArray(snapshot.module_rows);
    const candidateId = text(normalizedCandidate.row_id || normalizedCandidate.request_id || normalizedCandidate.details.request_id);
    const withoutCandidate = rows.filter(row => text(row.row_id || row.request_id || detailsFor(row).request_id) !== candidateId);
    const nextSnapshot = { ...snapshot, module_rows: [...withoutCandidate, normalizedCandidate] };
    return validateApprovedLeaveCaps(nextSnapshot);
  }

  return {
    FULL_DAY,
    FIRST_HALF,
    SECOND_HALF,
    normalizeDate,
    expandDates,
    normalizePortion,
    portionInterval,
    normalizeRequest,
    leaveRequests,
    resolveShift,
    activePolicy,
    approvedEvents,
    maximumConcurrent,
    approvedLeaveCapDeferrals,
    approvedLeaveCapViolations,
    validateApprovedLeaveCaps,
    evaluateApproval
  };
});
