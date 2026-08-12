(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WeeklyOffHolidayResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const token = value => text(value).toLowerCase();
  const array = value => Array.isArray(value) ? value : [];
  const active = record => token(record?.status || "Active") === "active";

  function scopeKeys(holiday = {}) {
    const keys = array(holiday.scope_keys).map(text).filter(Boolean);
    if (!keys.length && text(holiday.scope_key)) keys.push(text(holiday.scope_key));
    if (!keys.length && text(holiday.scope_type).toUpperCase() === "FULL_COVERAGE") keys.push("FULL_COVERAGE");
    return [...new Set(keys)];
  }

  function holidayMatchesLocation(holiday = {}, location = {}) {
    const scopeType = text(holiday.scope_type).toUpperCase();
    if (scopeType === "FULL_COVERAGE") return true;
    const record = location.record && typeof location.record === "object" ? location.record : {};
    const candidates = scopeType === "ENTITY"
      ? [location.parentCode, record.parent_entity_id, record.entity_id]
      : scopeType === "STATE"
        ? [location.state, record.state, record.state_code]
        : scopeType === "LOCATION"
          ? [location.id, location.name, location.listName]
          : [];
    const candidateTokens = new Set(candidates.map(token).filter(Boolean));
    return scopeKeys(holiday).some(key => candidateTokens.has(token(key)));
  }

  function parseIsoDate(value = "") {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isoDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function rosterRange(roster = {}) {
    let start = text(roster.start_date);
    let end = text(roster.end_date);
    if (!start || !end) {
      const matches = [...text(roster.period).matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)];
      if (matches.length >= 2) {
        start = `${matches[0][3]}-${matches[0][2]}-${matches[0][1]}`;
        end = `${matches[1][3]}-${matches[1][2]}-${matches[1][1]}`;
      }
    }
    return parseIsoDate(start) && parseIsoDate(end) && start <= end ? { start, end } : null;
  }

  function datesInRoster(roster = {}) {
    const range = rosterRange(roster);
    if (!range) return [];
    const dates = [];
    const cursor = parseIsoDate(range.start);
    const end = parseIsoDate(range.end);
    while (cursor <= end && dates.length < 370) {
      dates.push(isoDate(cursor));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }

  function isoDayOfWeek(dateIso = "") {
    const date = parseIsoDate(dateIso);
    if (!date) return 0;
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  function weeklyOffDayNumber(value) {
    const numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 7) return numeric;
    const normalized = token(value).replace(/^\d+\s*[-:]\s*/, "");
    const names = {
      monday: 1,
      mon: 1,
      tuesday: 2,
      tue: 2,
      wednesday: 3,
      wed: 3,
      thursday: 4,
      thu: 4,
      friday: 5,
      fri: 5,
      saturday: 6,
      sat: 6,
      sunday: 7,
      sun: 7
    };
    return names[normalized] || 0;
  }

  function policyIsActiveStandard(policy = {}) {
    const status = token(policy.policy_status || policy.status || "Active");
    const role = token(policy.coverage_role || policy.coverageRole || "Standard");
    return status === "active" && role !== "fallback";
  }

  function policyIsFixedWeeklyOff(policy = {}, dateIso = "") {
    return token(policy.weekly_off_pattern || policy.weeklyOffPattern) === "fixed"
      && weeklyOffDayNumber(policy.weekly_off_day ?? policy.weeklyOffDay ?? policy.fixed_weekly_off_day) === isoDayOfWeek(dateIso);
  }

  function resolveWeeklyOffContext({ roster = {}, location = {}, employee = {}, date = "", policies = [] } = {}) {
    const employeeId = text(employee.employee_id || employee.id);
    const explicitWeeklyOff = array(roster.weekly_offs).find(item =>
      text(item.employee_id) === employeeId && text(item.date) === text(date)
    );
    if (explicitWeeklyOff) {
      return {
        is_weekly_off: true,
        weekly_off_basis: "ROSTER_WEEKLY_OFF",
        roster_shift: "Weekly Off",
        attendance_shift: "Not applicable",
        requires_punch: false,
        source: explicitWeeklyOff
      };
    }

    if (location && date && !locationIsOpen(location, date)) {
      return {
        is_weekly_off: true,
        weekly_off_basis: "ORGANIZATION_CLOSED_DAY",
        roster_shift: "Weekly Off / Location Closed",
        attendance_shift: "Not applicable",
        requires_punch: false
      };
    }

    const activePolicies = array(policies).filter(policyIsActiveStandard);
    const preferredPolicyId = text(
      employee.default_shift_id
      || employee.shift_id
      || employee.assigned_shift_id
      || employee.attendance_shift_id
    );
    const preferredPolicy = preferredPolicyId
      ? activePolicies.find(policy => text(policy.policy_id || policy.shift_id) === preferredPolicyId)
      : null;
    const fixedPolicy = preferredPolicy
      ? (policyIsFixedWeeklyOff(preferredPolicy, date) ? preferredPolicy : null)
      : (activePolicies.length && activePolicies.every(policy => policyIsFixedWeeklyOff(policy, date)) ? activePolicies[0] : null);
    if (!fixedPolicy) return null;
    return {
      is_weekly_off: true,
      weekly_off_basis: "SHIFT_POLICY_FIXED_DAY",
      policy_id: text(fixedPolicy.policy_id || fixedPolicy.shift_id),
      roster_shift: "Weekly Off",
      attendance_shift: "Not applicable",
      requires_punch: false
    };
  }

  function locationIsOpen(location = {}, dateIso = "") {
    const dayOfWeek = isoDayOfWeek(dateIso);
    const rows = array(location.operatingHoursRecords || location.operating_hours_records || location.operating_hours);
    const configured = rows.find(row => Number(row.dayOfWeek ?? row.day_of_week) === dayOfWeek);
    if (configured) {
      const value = configured.isOpen ?? configured.is_open;
      return value === true || ["true", "yes", "1", "open"].includes(token(value));
    }
    const closedDay = token(location.closedDay || location.closed_day);
    if (!closedDay) return true;
    const dayName = ["", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][dayOfWeek];
    return closedDay !== dayName && closedDay !== dayName.slice(0, 3);
  }

  function employeeMatchesLocation(employee = {}, location = {}) {
    const candidates = new Set([location.id, location.name, location.listName].map(token).filter(Boolean));
    return [employee.location_id, employee.location, employee.location_label].some(value => candidates.has(token(value)));
  }

  function employeeActiveOnDate(employee = {}, dateIso = "") {
    if (!active(employee)) return false;
    const start = text(employee.employment_start_date || employee.date_of_joining || employee.joining_date);
    const end = text(employee.employment_end_date || employee.date_of_exit || employee.relieving_date);
    return (!start || start <= dateIso) && (!end || end >= dateIso);
  }

  function holidayForDate(holidays = [], dateIso = "", location = {}) {
    return array(holidays).find(holiday =>
      active(holiday)
      && text(holiday.holiday_date) === dateIso
      && holidayMatchesLocation(holiday, location)
    ) || null;
  }

  function candidateRecord({ employee = {}, weeklyOff = {}, holiday = {}, roster = {}, location = {}, date = "", basis = "" } = {}) {
    return {
      employee_id: text(employee.employee_id || employee.id || weeklyOff.employee_id),
      employee_name: text(weeklyOff.employee_name || employee.employee_name || employee.name || employee.employee_id || employee.id),
      organization_id: text(employee.organization_id || employee.parent_entity_id || employee.entity_id || location.parentCode),
      location_id: text(roster.location_id || employee.location_id || location.id),
      location: text(employee.location || employee.location_label || location.listName || location.name || location.id),
      date,
      holiday_id: text(holiday.holiday_id || `${date}-holiday`),
      holiday_name: text(holiday.holiday_name || "Declared holiday"),
      roster_id: text(roster.roster_id),
      source_type: "WEEKLY_OFF_HOLIDAY",
      weekly_off_basis: basis
    };
  }

  function resolveCandidates({ rosters = [], locations = [], employees = [], holidays = [] } = {}) {
    const candidates = new Map();
    array(rosters)
      .filter(roster => token(roster.status) === "published")
      .forEach(roster => {
        const location = array(locations).find(item => text(item.id) === text(roster.location_id));
        if (!location) return;
        const locationEmployees = array(employees).filter(employee => employeeMatchesLocation(employee, location));

        array(roster.weekly_offs).forEach(weeklyOff => {
          const date = text(weeklyOff.date);
          const employeeId = text(weeklyOff.employee_id);
          const holiday = holidayForDate(holidays, date, location);
          const employee = locationEmployees.find(item => text(item.employee_id || item.id) === employeeId);
          if (!date || !employee || !employeeActiveOnDate(employee, date) || !holiday) return;
          candidates.set(`${employeeId}|${date}`, candidateRecord({
            employee,
            weeklyOff,
            holiday,
            roster,
            location,
            date,
            basis: "ROSTER_WEEKLY_OFF"
          }));
        });

        datesInRoster(roster).forEach(date => {
          if (locationIsOpen(location, date)) return;
          const holiday = holidayForDate(holidays, date, location);
          if (!holiday) return;
          locationEmployees
            .filter(employee => employeeActiveOnDate(employee, date))
            .forEach(employee => {
              const employeeId = text(employee.employee_id || employee.id);
              const businessKey = `${employeeId}|${date}`;
              if (candidates.has(businessKey)) return;
              candidates.set(businessKey, candidateRecord({
                employee,
                holiday,
                roster,
                location,
                date,
                basis: "ORGANIZATION_CLOSED_DAY"
              }));
            });
        });
      });
    return [...candidates.values()];
  }

  return {
    datesInRoster,
    holidayMatchesLocation,
    locationIsOpen,
    policyIsFixedWeeklyOff,
    resolveCandidates,
    resolveWeeklyOffContext,
    rosterRange,
    scopeKeys,
    weeklyOffDayNumber
  };
});
