(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsReferentialIntegrity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const array = value => Array.isArray(value) ? value : [];
  const referenceFields = ["assignments", "open_slots", "conflicts_list", "warnings_list"];

  function employeeDetails(employee = {}) {
    return employee.record && typeof employee.record === "object" ? employee.record : {};
  }

  function moduleDetails(row = {}) {
    return row.details && typeof row.details === "object" ? row.details : {};
  }

  function moduleRecordId(row = {}) {
    const details = moduleDetails(row);
    return text(row.row_id || row.id || row.request_id || details.request_id || array(row.cells)[0]);
  }

  function rosterShiftReferences(roster = {}) {
    const references = [];
    for (const field of referenceFields) {
      for (const item of array(roster[field])) {
        const shiftId = text(item?.shift_id || item?.policy_id);
        if (!shiftId) continue;
        references.push({
          field,
          shiftId,
          shiftName: text(item?.shift_name || item?.policy_name),
          date: text(item?.date)
        });
      }
    }
    return references;
  }

  function validateRosterShiftReferences(snapshot = {}) {
    const policiesById = new Map(
      array(snapshot.shift_policies)
        .map(policy => [text(policy?.policy_id), policy])
        .filter(([policyId]) => Boolean(policyId))
    );
    const blockers = [];
    const seen = new Set();

    for (const roster of array(snapshot.rosters)) {
      const rosterId = text(roster?.roster_id);
      const rosterLocationId = text(roster?.location_id);
      for (const reference of rosterShiftReferences(roster)) {
        const policy = policiesById.get(reference.shiftId);
        const policyLocationId = text(policy?.location_id);
        const reason = !policy
          ? "Missing shift policy"
          : policyLocationId !== rosterLocationId
            ? `Shift policy belongs to ${policyLocationId || "another location"}`
            : "";
        if (!reason) continue;

        const dedupeKey = [rosterId, rosterLocationId, reference.shiftId, reason].join("|");
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        blockers.push({
          roster_id: rosterId,
          location_id: rosterLocationId,
          shift_id: reference.shiftId,
          shift_name: reference.shiftName,
          field: reference.field,
          date: reference.date,
          reason
        });
      }
    }

    if (!blockers.length) return { ok: true, blockers: [] };
    const labels = blockers.map(blocker => `${blocker.shift_id} in ${blocker.roster_id}`);
    return {
      ok: false,
      table: "rosters",
      blockers,
      error: `Roster save blocked. Restore or reassign missing location shift policies first: ${labels.join(", ")}.`
    };
  }

  function validateEmployeeFamilyReferences(snapshot = {}) {
    const employeeIds = new Set(array(snapshot.employees).map(employee => text(employee?.employee_id)).filter(Boolean));
    const blockers = array(snapshot.employee_family_members)
      .filter(member => text(member?.employee_id) && !employeeIds.has(text(member.employee_id)))
      .map(member => ({
        family_member_id: text(member?.family_member_id),
        employee_id: text(member?.employee_id),
        member_name: text(member?.member_name),
        reason: "Employee does not exist"
      }));
    if (!blockers.length) return { ok: true, blockers: [] };
    return {
      ok: false,
      table: "employee_family_members",
      blockers,
      error: `Family-member save blocked. Restore the linked employee first: ${[...new Set(blockers.map(blocker => blocker.employee_id))].join(", ")}.`
    };
  }

  function validateEmployeeLinkedReferences(snapshot = {}) {
    const employeeIds = new Set(array(snapshot.employees).map(employee => text(employee?.employee_id)).filter(Boolean));
    const linkedTables = [
      ["employee_documents", "document_id"],
      ["employee_education", "education_id"],
      ["employee_experience", "experience_id"],
      ["employee_skills", "skill_id"],
      ["employee_finance_benefits", "finance_benefit_id"]
    ];
    for (const [table, key] of linkedTables) {
      const blockers = array(snapshot[table])
        .filter(record => text(record?.employee_id) && !employeeIds.has(text(record.employee_id)))
        .map(record => ({
          record_id: text(record?.[key]),
          employee_id: text(record?.employee_id),
          reason: "Employee does not exist"
        }));
      if (blockers.length) {
        return {
          ok: false,
          table,
          blockers,
          error: `${table.replace(/_/g, " ")} save blocked. Restore the linked employee first: ${[...new Set(blockers.map(blocker => blocker.employee_id))].join(", ")}.`
        };
      }
    }
    return { ok: true, blockers: [] };
  }

  function validateEmployeeOperationalReferences(snapshot = {}) {
    const employees = array(snapshot.employees);
    const employeeIds = new Set(employees.map(employee => text(employee?.employee_id)).filter(Boolean));
    const shiftPolicies = new Map(
      array(snapshot.shift_policies)
        .map(policy => [text(policy?.policy_id), policy])
        .filter(([policyId]) => Boolean(policyId))
    );
    const blockers = [];

    for (const employee of employees) {
      const employeeId = text(employee?.employee_id);
      const details = employeeDetails(employee);
      const managerId = text(details.reporting_manager_id);
      const defaultShiftId = text(details.default_shift_id);
      if (managerId && (managerId === employeeId || !employeeIds.has(managerId))) {
        blockers.push({
          employee_id: employeeId,
          reference_id: managerId,
          field: "reporting_manager_id",
          reason: managerId === employeeId ? "Employee cannot report to themselves" : "Reporting manager does not exist"
        });
      }
      if (defaultShiftId && !shiftPolicies.has(defaultShiftId)) {
        blockers.push({
          employee_id: employeeId,
          reference_id: defaultShiftId,
          field: "default_shift_id",
          reason: "Default shift policy does not exist"
        });
      }
    }

    for (const policy of shiftPolicies.values()) {
      for (const field of ["primary_keyholder_id", "backup_keyholder_id"]) {
        const employeeId = text(policy?.[field]);
        if (!employeeId || employeeIds.has(employeeId)) continue;
        blockers.push({
          shift_policy_id: text(policy?.policy_id),
          reference_id: employeeId,
          field,
          reason: "Keyholder employee does not exist"
        });
      }
    }

    if (!blockers.length) return { ok: true, blockers: [] };
    return {
      ok: false,
      table: blockers[0].shift_policy_id ? "shift_policies" : "employees",
      blockers,
      error: `HRMS save blocked. Reassign the missing reporting manager, default shift or keyholder first: ${[...new Set(blockers.map(blocker => blocker.reference_id))].join(", ")}.`
    };
  }

  function validateAttendanceReferences(snapshot = {}) {
    const employeeIds = new Set(array(snapshot.employees).map(employee => text(employee?.employee_id)).filter(Boolean));
    const rosterIds = new Set(array(snapshot.rosters).map(roster => text(roster?.roster_id)).filter(Boolean));
    const policyIds = new Set(array(snapshot.attendance_policies).map(policy => text(policy?.policy_id)).filter(Boolean));
    const leaveRequestIds = new Set(
      array(snapshot.module_rows)
        .filter(row => text(row?.pageKey || row?.page_key).toLowerCase() === "leave-requests")
        .map(moduleRecordId)
        .filter(Boolean)
    );
    const blockers = [];
    for (const record of array(snapshot.attendance)) {
      const recordId = text(record?.id);
      const checks = [
        ["employee_id", text(record?.employee_id), employeeIds, "Employee does not exist"],
        ["roster_id", text(record?.roster_id), rosterIds, "Roster does not exist"],
        ["policy_id", text(record?.policy_id), policyIds, "Attendance policy does not exist"],
        ["leave_request_id", text(record?.leave_request_id), leaveRequestIds, "Leave request does not exist"]
      ];
      for (const [field, referenceId, ids, reason] of checks) {
        if (!referenceId || ids.has(referenceId)) continue;
        blockers.push({ attendance_id: recordId, field, reference_id: referenceId, reason });
      }
    }
    if (!blockers.length) return { ok: true, blockers: [] };
    return {
      ok: false,
      table: "attendance",
      blockers,
      error: `Attendance save blocked. Restore or unlink missing referenced records first: ${[...new Set(blockers.map(blocker => blocker.reference_id))].join(", ")}.`
    };
  }

  function validateRosterLeaveRequestReferences(snapshot = {}) {
    const leaveRequestIds = new Set(
      array(snapshot.module_rows)
        .filter(row => text(row?.pageKey || row?.page_key).toLowerCase() === "leave-requests")
        .map(moduleRecordId)
        .filter(Boolean)
    );
    const blockers = [];
    for (const roster of array(snapshot.rosters)) {
      for (const leaveDay of array(roster?.leave_days)) {
        const requestId = text(leaveDay?.leave_request_id || leaveDay?.request_id);
        if (!requestId || leaveRequestIds.has(requestId)) continue;
        blockers.push({
          roster_id: text(roster?.roster_id),
          leave_request_id: requestId,
          date: text(leaveDay?.date),
          reason: "Leave request does not exist"
        });
      }
    }
    if (!blockers.length) return { ok: true, blockers: [] };
    return {
      ok: false,
      table: "rosters",
      blockers,
      error: `Roster save blocked. Restore or unlink missing leave requests first: ${[...new Set(blockers.map(blocker => blocker.leave_request_id))].join(", ")}.`
    };
  }

  function validateEmployeeUniqueIdentifiers(snapshot = {}) {
    const checks = [
      {
        table: "employee_documents",
        rows: array(snapshot.employee_documents).filter(row => ["aadhaar", "pan"].includes(text(row?.document_type).toLowerCase())),
        fields: row => [text(row?.document_type).toLowerCase(), text(row?.document_number).toUpperCase()],
        label: row => `${text(row?.document_type)} ${text(row?.document_number)}`
      },
      {
        table: "employee_finance_benefits",
        rows: array(snapshot.employee_finance_benefits).filter(row => text(row?.uan_number)),
        fields: row => ["uan", text(row?.uan_number)],
        label: row => `UAN ${text(row?.uan_number)}`
      },
      {
        table: "employee_finance_benefits",
        rows: array(snapshot.employee_finance_benefits).filter(row => text(row?.esi_number)),
        fields: row => ["esi", text(row?.esi_number)],
        label: row => `ESI ${text(row?.esi_number)}`
      }
    ];
    for (const check of checks) {
      const seen = new Map();
      const blockers = [];
      for (const row of check.rows) {
        const values = check.fields(row);
        if (values.some(value => !value)) continue;
        const key = values.join("|");
        if (!seen.has(key)) {
          seen.set(key, row);
          continue;
        }
        blockers.push({
          employee_id: text(row?.employee_id),
          duplicate_employee_id: text(seen.get(key)?.employee_id),
          identifier: check.label(row),
          reason: "Identifier is already assigned"
        });
      }
      if (blockers.length) {
        return {
          ok: false,
          table: check.table,
          blockers,
          error: `${blockers[0].identifier} is already assigned to another employee.`
        };
      }
    }
    return { ok: true, blockers: [] };
  }

  function validateHrmsReferences(snapshot = {}) {
    const validators = [
      validateRosterShiftReferences,
      validateEmployeeFamilyReferences,
      validateEmployeeLinkedReferences,
      validateEmployeeOperationalReferences,
      validateAttendanceReferences,
      validateRosterLeaveRequestReferences,
      validateEmployeeUniqueIdentifiers
    ];
    for (const validate of validators) {
      const result = validate(snapshot);
      if (!result.ok) return result;
    }
    return { ok: true, blockers: [] };
  }

  return {
    rosterShiftReferences,
    validateEmployeeFamilyReferences,
    validateEmployeeLinkedReferences,
    validateEmployeeOperationalReferences,
    validateAttendanceReferences,
    validateRosterLeaveRequestReferences,
    validateEmployeeUniqueIdentifiers,
    validateHrmsReferences,
    validateRosterShiftReferences
  };
});
