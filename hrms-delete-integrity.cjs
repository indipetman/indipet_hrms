(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsDeleteIntegrity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const same = (left, right) => Boolean(text(left)) && text(left) === text(right);
  const array = value => Array.isArray(value) ? value : [];
  const label = (count, singular, plural = `${singular}s`) => count ? `${count} ${count === 1 ? singular : plural}` : "";
  const unique = values => [...new Set(values.filter(Boolean))];
  const holidayScopeKeys = record => {
    const keys = array(record?.scope_keys).map(text).filter(Boolean);
    if (!keys.length && text(record?.scope_key)) keys.push(text(record.scope_key));
    return keys;
  };

  function nestedReferences(value, target) {
    if (!target || value == null) return false;
    if (Array.isArray(value)) return value.some(item => nestedReferences(item, target));
    if (typeof value === "object") return Object.values(value).some(item => nestedReferences(item, target));
    return same(value, target);
  }

  function moduleRowDetails(row = {}) {
    return row.details && typeof row.details === "object" ? row.details : {};
  }

  function modulePageKey(row = {}) {
    return text(row.pageKey || row.page_key).toLowerCase();
  }

  function moduleRecordId(row = {}) {
    const details = moduleRowDetails(row);
    return text(row.row_id || row.id || row.request_id || details.request_id || array(row.cells)[0]);
  }

  function isoDate(value) {
    const raw = text(value);
    if (!raw) return "";
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const display = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return display ? `${display[3]}-${display[2]}-${display[1]}` : "";
  }

  function attendanceFacts(record = {}) {
    const details = moduleRowDetails(record);
    const cells = array(record.cells);
    return {
      id: text(record.id || record.record_id || details.record_id || details.attendance_id || record.row_id),
      employeeId: text(record.employee_id || details.employee_id || cells[2]),
      locationId: text(record.location_id || details.location_id),
      workDate: isoDate(record.work_date || details.work_date || details.date || cells[0]),
      rosterId: text(record.roster_id || details.roster_id),
      sourceId: text(record.source_id || details.source_id),
      isAttendanceModule: text(record.pageKey || record.page_key).toLowerCase() === "attendance-list"
    };
  }

  function rosterDateRange(roster = {}) {
    let start = isoDate(roster.start_date);
    let end = isoDate(roster.end_date);
    if ((!start || !end) && text(roster.period)) {
      const parts = text(roster.period).split(/\s+-\s+/);
      start ||= isoDate(parts[0]);
      end ||= isoDate(parts[1]);
    }
    return { start, end };
  }

  function rosterContainsDate(roster = {}, workDate = "") {
    const date = isoDate(workDate);
    const { start, end } = rosterDateRange(roster);
    return Boolean(date && start && end && date >= start && date <= end);
  }

  function rosterEntryMatchesAttendance(roster = {}, facts = {}) {
    if (!facts.employeeId || !facts.workDate) return false;
    return ["assignments", "weekly_offs", "draft_weekly_offs", "leave_days", "excluded"]
      .some(key => array(roster[key]).some(item =>
        same(item.employee_id, facts.employeeId)
        && isoDate(item.date || item.work_date) === facts.workDate
      ));
  }

  function rosterLifecycleIsFinal(roster = {}) {
    return ["published", "superseded"].includes(text(roster.status).toLowerCase());
  }

  function rosterMatchesLegacyAttendance(roster = {}, facts = {}) {
    if (!rosterLifecycleIsFinal(roster)) return false;
    if (!same(roster.location_id, facts.locationId) || !rosterContainsDate(roster, facts.workDate)) return false;
    // Final roster versions form the audit basis for attendance at their location
    // and period. This fallback protects legacy attendance whose direct roster_id
    // was omitted by older clients, including weekly-off work.
    return true;
  }

  function rosterScoreForAttendance(roster = {}, facts = {}) {
    if (!same(roster.location_id, facts.locationId) || !rosterContainsDate(roster, facts.workDate)) return -1;
    let score = rosterEntryMatchesAttendance(roster, facts) ? 1000 : 0;
    const status = text(roster.status).toLowerCase();
    if (status === "published") score += 300;
    else if (status === "superseded") score += 200;
    else if (status === "ready to publish") score += 100;
    score += Number(roster.version || 0);
    return score;
  }

  function bestRosterForAttendance(rosters = [], facts = {}) {
    return array(rosters)
      .map(roster => ({ roster, score: rosterScoreForAttendance(roster, facts) }))
      .filter(candidate => candidate.score >= 0)
      .sort((left, right) => right.score - left.score)[0]?.roster || null;
  }

  function attendanceLogicalKey(facts = {}) {
    return facts.id || [facts.employeeId, facts.workDate, facts.locationId].filter(Boolean).join("|");
  }

  function matchingAttendanceModule(modules = [], facts = {}) {
    const exact = array(modules).find(row => {
      const moduleFacts = attendanceFacts(row);
      return moduleFacts.isAttendanceModule && facts.id && moduleFacts.id === facts.id;
    });
    if (exact) return exact;
    return array(modules).find(row => {
      const moduleFacts = attendanceFacts(row);
      return moduleFacts.isAttendanceModule
        && facts.employeeId && moduleFacts.employeeId === facts.employeeId
        && facts.workDate && moduleFacts.workDate === facts.workDate
        && (!facts.locationId || !moduleFacts.locationId || moduleFacts.locationId === facts.locationId);
    }) || null;
  }

  function repairRosterAttendanceLinks(snapshot = {}) {
    const rosters = array(snapshot.rosters).map(roster => ({ ...roster }));
    const validRosterIds = new Set(rosters.map(roster => text(roster.roster_id)).filter(Boolean));
    const modules = array(snapshot.module_rows).map(row => ({
      ...row,
      details: row.details && typeof row.details === "object" ? { ...row.details } : row.details
    }));
    const attendance = array(snapshot.attendance).map(record => ({ ...record }));
    let repairedAttendanceCount = 0;
    let repairedModuleCount = 0;

    attendance.forEach(record => {
      const facts = attendanceFacts(record);
      if (facts.rosterId && validRosterIds.has(facts.rosterId)) return;
      const moduleRow = matchingAttendanceModule(modules, facts);
      const moduleRosterId = attendanceFacts(moduleRow || {}).rosterId;
      const roster = moduleRosterId && validRosterIds.has(moduleRosterId)
        ? rosters.find(item => same(item.roster_id, moduleRosterId))
        : bestRosterForAttendance(rosters, facts);
      const rosterId = text(roster?.roster_id);
      if (!rosterId || same(record.roster_id, rosterId)) return;
      record.roster_id = rosterId;
      repairedAttendanceCount += 1;
    });

    modules.forEach(row => {
      const facts = attendanceFacts(row);
      if (!facts.isAttendanceModule) return;
      if (facts.rosterId && validRosterIds.has(facts.rosterId)) return;
      const directAttendance = attendance.find(record => {
        const directFacts = attendanceFacts(record);
        return facts.id && directFacts.id === facts.id
          || (facts.employeeId && directFacts.employeeId === facts.employeeId
            && facts.workDate && directFacts.workDate === facts.workDate
            && (!facts.locationId || !directFacts.locationId || directFacts.locationId === facts.locationId));
      });
      const directRosterId = attendanceFacts(directAttendance || {}).rosterId;
      const roster = directRosterId && validRosterIds.has(directRosterId)
        ? rosters.find(item => same(item.roster_id, directRosterId))
        : bestRosterForAttendance(rosters, facts);
      const rosterId = text(roster?.roster_id);
      if (!rosterId || same(moduleRowDetails(row).roster_id, rosterId)) return;
      row.details = { ...moduleRowDetails(row), roster_id: rosterId };
      repairedModuleCount += 1;
    });

    return {
      snapshot: { ...snapshot, rosters, attendance, module_rows: modules },
      changed: repairedAttendanceCount > 0 || repairedModuleCount > 0,
      repairedAttendanceCount,
      repairedModuleCount
    };
  }

  function rosterAttendanceDependencyCount(snapshot = {}, roster = {}, rosterId = "") {
    const dependencies = new Map();
    const add = record => {
      const facts = attendanceFacts(record);
      const key = attendanceLogicalKey(facts);
      if (key) dependencies.set(key, facts);
    };
    array(snapshot.attendance).forEach(record => {
      const facts = attendanceFacts(record);
      if (same(facts.rosterId, rosterId) || same(facts.sourceId, rosterId) || rosterMatchesLegacyAttendance(roster, facts)) add(record);
    });
    array(snapshot.module_rows).forEach(record => {
      const facts = attendanceFacts(record);
      if (!facts.isAttendanceModule) return;
      if (same(facts.rosterId, rosterId) || same(facts.sourceId, rosterId) || rosterMatchesLegacyAttendance(roster, facts)) add(record);
    });
    return dependencies.size;
  }

  function rosterReferencesEmployee(roster = {}, employeeId = "") {
    return ["assignments", "weekly_offs", "draft_weekly_offs", "leave_days", "rotation_exceptions", "excluded"]
      .some(key => array(roster[key]).some(item => same(item.employee_id, employeeId)));
  }

  function rosterReferencesShift(roster = {}, shiftId = "") {
    return ["assignments", "open_slots", "conflicts_list", "warnings_list"]
      .some(key => array(roster[key]).some(item => same(item.shift_id, shiftId) || same(item.policy_id, shiftId)));
  }

  function collectDependencies(snapshot = {}, request = {}) {
    const recordType = text(request.recordType).toLowerCase();
    const recordId = text(request.recordId);
    const record = request.record && typeof request.record === "object" ? request.record : {};
    const employees = array(snapshot.employees);
    const familyMembers = array(snapshot.employee_family_members);
    const employeeDocuments = array(snapshot.employee_documents);
    const employeeEducation = array(snapshot.employee_education);
    const employeeExperience = array(snapshot.employee_experience);
    const employeeSkills = array(snapshot.employee_skills);
    const employeeFinanceBenefits = array(snapshot.employee_finance_benefits);
    const attendance = array(snapshot.attendance);
    const attendancePolicies = array(snapshot.attendance_policies);
    const penaltyRules = array(snapshot.attendance_penalty_rules);
    const penaltyCounters = array(snapshot.attendance_incident_counters);
    const penaltyTransactions = array(snapshot.attendance_penalty_transactions);
    const notifications = array(snapshot.in_app_notifications);
    const leavePolicies = array(snapshot.leave_policies);
    const ledger = array(snapshot.leave_ledger);
    const holidays = array(snapshot.holiday_calendar);
    const rosters = array(snapshot.rosters);
    const shiftPolicies = array(snapshot.shift_policies);
    const modules = array(snapshot.module_rows);
    const operatingContexts = array(snapshot.operating_contexts);
    const dependencies = [];

    if (recordType === "employee") {
      dependencies.push(label(familyMembers.filter(item => same(item.employee_id, recordId)).length, "family-member record"));
      dependencies.push(label(employeeDocuments.filter(item => same(item.employee_id, recordId)).length, "employee document"));
      dependencies.push(label(employeeEducation.filter(item => same(item.employee_id, recordId)).length, "education record"));
      dependencies.push(label(employeeExperience.filter(item => same(item.employee_id, recordId)).length, "experience record"));
      dependencies.push(label(employeeSkills.filter(item => same(item.employee_id, recordId)).length, "skill record"));
      dependencies.push(label(employeeFinanceBenefits.filter(item => same(item.employee_id, recordId)).length, "finance/statutory record"));
      dependencies.push(label(employees.filter(item => {
        if (same(item.employee_id, recordId)) return false;
        const detail = item.record && typeof item.record === "object" ? item.record : {};
        return same(detail.reporting_manager_id, recordId);
      }).length, "direct-report assignment"));
      dependencies.push(label(shiftPolicies.filter(item =>
        same(item.primary_keyholder_id, recordId) || same(item.backup_keyholder_id, recordId)
      ).length, "shift-policy keyholder assignment"));
      dependencies.push(label(attendance.filter(item => same(item.employee_id, recordId)).length, "attendance record"));
      dependencies.push(label(penaltyCounters.filter(item => same(item.employee_id, recordId)).length, "attendance incident counter"));
      dependencies.push(label(penaltyTransactions.filter(item => same(item.employee_id, recordId)).length, "attendance penalty transaction"));
      dependencies.push(label(notifications.filter(item => same(item.recipient_employee_id, recordId)).length, "in-app notification"));
      dependencies.push(label(ledger.filter(item => same(item.employee_id, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
      dependencies.push(label(rosters.filter(item => rosterReferencesEmployee(item, recordId)).length, "roster"));
      dependencies.push(label(modules.filter(item => nestedReferences(moduleRowDetails(item), recordId)).length, "workflow record"));
    }

    if (recordType === "attendance") {
      dependencies.push(label(ledger.filter(item => same(item.source_id, recordId) || nestedReferences(item.history, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
      dependencies.push(label(penaltyTransactions.filter(item => nestedReferences(item.source_attendance_ids, recordId)).length, "attendance penalty transaction"));
      dependencies.push(label(modules.filter(item =>
        modulePageKey(item) !== "attendance-list"
        && same(moduleRowDetails(item).attendance_id, recordId)
      ).length, "downstream workflow record"));
    }

    if (recordType === "attendance-policy") {
      dependencies.push(label(attendance.filter(item => same(item.policy_id, recordId) || same(item.rules?.policy_id, recordId)).length, "calculated attendance record"));
      dependencies.push(label(penaltyRules.filter(item => same(item.policy_id, recordId)).length, "incident conversion rule"));
      dependencies.push(label(penaltyTransactions.filter(item => same(item.policy_id, recordId)).length, "attendance penalty transaction"));
      dependencies.push(label(notifications.filter(item => same(item.payload?.policy_id, recordId)).length, "in-app notification"));
      dependencies.push(label(modules.filter(item => same(moduleRowDetails(item).policy_id, recordId)).length, "workflow record"));
    }

    if (recordType === "leave-policy") {
      dependencies.push(label(ledger.filter(item => same(item.policy_id, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
      dependencies.push(label(modules.filter(item => same(moduleRowDetails(item).policy_id, recordId)).length, "leave workflow record"));
    }

    if (recordType === "holiday") {
      const holidayDate = text(record.holiday_date || request.holidayDate);
      dependencies.push(label(ledger.filter(item => same(item.holiday_id, recordId)).length, "compensatory-off ledger entry"));
      dependencies.push(label(rosters.filter(item =>
        array(item.weekly_offs).some(off => same(off.date, holidayDate))
        || array(item.assignments).some(assignment => same(assignment.date, holidayDate))
      ).length, "roster"));
    }

    if (recordType === "roster") {
      dependencies.push(label(rosterAttendanceDependencyCount(snapshot, record, recordId), "attendance record"));
      dependencies.push(label(ledger.filter(item => same(item.source_id, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
      dependencies.push(label(modules.filter(item => {
        const facts = attendanceFacts(item);
        return !facts.isAttendanceModule && same(moduleRowDetails(item).roster_id, recordId);
      }).length, "workflow record"));
    }

    if (recordType === "shift-policy") {
      dependencies.push(label(rosters.filter(item => rosterReferencesShift(item, recordId)).length, "roster"));
      dependencies.push(label(employees.filter(item => {
        const detail = item.record && typeof item.record === "object" ? item.record : {};
        return same(detail.default_shift_id, recordId);
      }).length, "employee default-shift assignment"));
      dependencies.push(label(modules.filter(item =>
        modulePageKey(item) !== "attendance-list"
        && nestedReferences(moduleRowDetails(item), recordId)
      ).length, "workflow/history record"));
    }

    if (recordType === "entity") {
      dependencies.push(label(employees.filter(item => {
        const detail = item.record && typeof item.record === "object" ? item.record : {};
        return same(detail.parent_entity_id, recordId) || same(detail.entity_id, recordId);
      }).length, "employee"));
      dependencies.push(label(attendancePolicies.filter(item => same(item.entity_id, recordId)).length, "attendance policy", "attendance policies"));
      dependencies.push(label(leavePolicies.filter(item => same(item.organization_id, recordId)).length, "leave policy", "leave policies"));
      dependencies.push(label(holidays.filter(item => same(item.organization_id, recordId) || holidayScopeKeys(item).some(key => same(key, recordId))).length, "holiday-calendar record"));
      dependencies.push(label(ledger.filter(item => same(item.organization_id, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
      dependencies.push(label(shiftPolicies.filter(item => same(item.entity_id, recordId) || same(item.organization_id, recordId)).length, "shift policy", "shift policies"));
      dependencies.push(label(notifications.filter(item => same(item.entity_id, recordId)).length, "in-app notification"));
      dependencies.push(label(operatingContexts.filter(item => same(item.primary_entity_id, recordId) || same(item.active_entity_id, recordId)).length, "operating context"));
    }

    if (recordType === "location") {
      dependencies.push(label(employees.filter(item => {
        const detail = item.record && typeof item.record === "object" ? item.record : {};
        return same(detail.location_id, recordId);
      }).length, "employee"));
      dependencies.push(label(attendance.filter(item => same(item.location_id, recordId)).length, "attendance record"));
      dependencies.push(label(rosters.filter(item => same(item.location_id, recordId)).length, "roster"));
      dependencies.push(label(holidays.filter(item => text(item.scope_type).toUpperCase() === "LOCATION" && holidayScopeKeys(item).some(key => same(key, recordId))).length, "holiday-calendar record"));
      dependencies.push(label(shiftPolicies.filter(item => same(item.location_id, recordId)).length, "shift policy", "shift policies"));
      dependencies.push(label(ledger.filter(item => same(item.location_id, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
      dependencies.push(label(notifications.filter(item => same(item.location_id, recordId)).length, "in-app notification"));
    }

    if (recordType === "department" || recordType === "designation") {
      const detailKey = recordType === "department" ? "department_id" : "designation_id";
      dependencies.push(label(employees.filter(item => {
        const detail = item.record && typeof item.record === "object" ? item.record : {};
        return same(detail[detailKey], recordId) || same(detail[detailKey.replace("_id", "_label")], record.name);
      }).length, "employee"));
      if (recordType === "department") {
        dependencies.push(label(modules.filter(item =>
          modulePageKey(item) === "designation-master"
          && (nestedReferences(item, recordId) || (record.name && nestedReferences(item, record.name)))
        ).length, "designation"));
      } else {
        dependencies.push(label(modules.filter(item => {
          if (modulePageKey(item) !== "department-master") return false;
          const details = moduleRowDetails(item);
          return same(details.department_head_designation, recordId)
            || same(details.department_head_designation, record.name);
        }).length, "department-head assignment"));
      }
    }

    if (recordType === "leave-request") {
      dependencies.push(label(rosters.filter(item => array(item.leave_days).some(day => same(day.request_id, recordId) || same(day.leave_request_id, recordId))).length, "roster"));
      dependencies.push(label(attendance.filter(item => same(item.leave_request_id, recordId)).length, "attendance record"));
      dependencies.push(label(ledger.filter(item => same(item.source_id, recordId)).length, "leave-ledger entry", "leave-ledger entries"));
    }

    if (recordType === "leave-ledger") {
      const workflow = text(record.workflow_status || record.status).toUpperCase().replace(/[ -]+/g, "_");
      if (workflow === "PAYROLL_APPLIED" || text(record.payroll_status).toUpperCase() === "APPLIED") {
        dependencies.push("payroll-applied transaction");
      }
    }

    return unique(dependencies);
  }

  const tableDeletionTypes = {
    employees: { key: "employee_id", recordType: "employee" },
    attendance: { key: "id", recordType: "attendance" },
    attendance_policies: { key: "policy_id", recordType: "attendance-policy" },
    leave_policies: { key: "policy_id", recordType: "leave-policy" },
    holiday_calendar: { key: "holiday_id", recordType: "holiday" },
    leave_ledger: { key: "ledger_id", recordType: "leave-ledger" },
    rosters: { key: "roster_id", recordType: "roster" },
    shift_policies: { key: "policy_id", recordType: "shift-policy" }
  };

  const moduleDeletionTypes = {
    "leave-requests": "leave-request",
    "department-master": "department",
    "designation-master": "designation"
  };

  function validateSnapshotDeletion(current = {}, next = {}) {
    for (const [tableName, definition] of Object.entries(tableDeletionTypes)) {
      const nextIds = new Set(array(next[tableName]).map(item => text(item[definition.key])).filter(Boolean));
      const removed = array(current[tableName]).filter(item => text(item[definition.key]) && !nextIds.has(text(item[definition.key])));
      for (const record of removed) {
        const recordId = text(record[definition.key]);
        const blockers = collectDependencies(current, {
          recordType: definition.recordType,
          recordId,
          record
        });
        if (blockers.length) {
          return {
            ok: false,
            table: tableName,
            recordId,
            blockers,
            error: `Delete blocked for ${recordId}. Delete linked data first: ${blockers.join(", ")}.`
          };
        }
      }
    }
    const nextModuleIds = new Set(array(next.module_rows).map(moduleRecordId).filter(Boolean));
    const removedModules = array(current.module_rows).filter(row => {
      const rowId = moduleRecordId(row);
      return rowId && moduleDeletionTypes[modulePageKey(row)] && !nextModuleIds.has(rowId);
    });
    for (const record of removedModules) {
      const recordId = moduleRecordId(record);
      const recordType = moduleDeletionTypes[modulePageKey(record)];
      const blockers = collectDependencies(current, { recordType, recordId, record });
      if (blockers.length) {
        return {
          ok: false,
          table: "module_rows",
          recordId,
          blockers,
          error: `Delete blocked for ${recordId}. Delete linked data first: ${blockers.join(", ")}.`
        };
      }
    }
    return { ok: true, blockers: [] };
  }

  return {
    collectDependencies,
    validateSnapshotDeletion,
    nestedReferences,
    modulePageKey,
    moduleRecordId,
    repairRosterAttendanceLinks,
    rosterAttendanceDependencyCount
  };
});
