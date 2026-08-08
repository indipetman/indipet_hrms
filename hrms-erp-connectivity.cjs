(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsErpConnectivity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const array = value => Array.isArray(value) ? value : [];
  const inactive = record => text(record?.status).toLowerCase() === "inactive";

  function employeeDetails(employee = {}) {
    return employee.record && typeof employee.record === "object" ? employee.record : {};
  }

  function workflowDetails(record = {}) {
    return record.details && typeof record.details === "object" ? record.details : {};
  }

  function organizationReferences(snapshot = {}) {
    const references = [];
    const add = (table, recordId, field, referenceType, referenceId, pairedEntityId = "") => {
      const normalized = text(referenceId);
      if (!normalized) return;
      references.push({
        table,
        record_id: text(recordId),
        field,
        reference_type: referenceType,
        reference_id: normalized,
        paired_entity_id: text(pairedEntityId)
      });
    };

    array(snapshot.employees).forEach(employee => {
      const details = employeeDetails(employee);
      const entityId = details.parent_entity_id || details.entity_id || details.organization_id;
      add("employees", employee.employee_id, "parent_entity_id", "entity", entityId);
      add("employees", employee.employee_id, "location_id", "location", details.location_id, entityId);
    });

    array(snapshot.attendance).forEach(record => {
      add("attendance", record.id, "entity_id", "entity", record.entity_id);
      add("attendance", record.id, "location_id", "location", record.location_id, record.entity_id);
    });

    array(snapshot.attendance_policies).forEach(record =>
      add("attendance_policies", record.policy_id, "entity_id", "entity", record.entity_id)
    );
    array(snapshot.attendance_policy_assignments).forEach(record =>
      add("attendance_policy_assignments", record.assignment_id, "entity_id", "entity", record.entity_id)
    );
    array(snapshot.attendance_penalty_transactions).forEach(record => {
      add("attendance_penalty_transactions", record.transaction_id, "entity_id", "entity", record.entity_id);
      add("attendance_penalty_transactions", record.transaction_id, "location_id", "location", record.location_id, record.entity_id);
    });

    array(snapshot.leave_policies).forEach(record =>
      add("leave_policies", record.policy_id, "organization_id", "entity", record.organization_id)
    );
    array(snapshot.leave_policy_assignments).forEach(record =>
      add("leave_policy_assignments", record.assignment_id, "organization_id", "entity", record.organization_id)
    );
    array(snapshot.leave_ledger).forEach(record => {
      add("leave_ledger", record.ledger_id, "organization_id", "entity", record.organization_id);
      add("leave_ledger", record.ledger_id, "location_id", "location", record.location_id, record.organization_id);
    });

    array(snapshot.holiday_calendar).forEach(record => {
      add("holiday_calendar", record.holiday_id, "organization_id", "entity", record.organization_id);
      if (text(record.scope_type).toUpperCase() === "LOCATION") {
        add("holiday_calendar", record.holiday_id, "scope_key", "location", record.scope_key, record.organization_id);
      }
      if (text(record.scope_type).toUpperCase() === "ENTITY") {
        add("holiday_calendar", record.holiday_id, "scope_key", "entity", record.scope_key);
      }
    });

    array(snapshot.shift_policies).forEach(record =>
      add("shift_policies", record.policy_id, "location_id", "location", record.location_id, record.entity_id || record.organization_id)
    );
    array(snapshot.rosters).forEach(record =>
      add("rosters", record.roster_id, "location_id", "location", record.location_id)
    );
    array(snapshot.keyholders).forEach(record =>
      add("keyholders", record.id, "locationId", "location", record.locationId)
    );
    array(snapshot.operating_contexts).forEach(record => {
      add("operating_contexts", record.context_id, "primary_entity_id", "entity", record.primary_entity_id);
      add("operating_contexts", record.context_id, "active_entity_id", "entity", record.active_entity_id);
    });

    array(snapshot.module_rows).forEach(record => {
      const details = workflowDetails(record);
      const recordId = record.row_id || record.request_id || details.request_id;
      const entityId = details.entity_id || details.organization_id;
      add("module_rows", recordId, details.organization_id ? "organization_id" : "entity_id", "entity", entityId);
      add("module_rows", recordId, "location_id", "location", details.location_id, entityId);
    });

    return references;
  }

  function needsOrganizationSnapshot(snapshot = {}) {
    return organizationReferences(snapshot).length > 0;
  }

  function validateAgainstOrganization(snapshot = {}, organization = null) {
    if (!organization || typeof organization !== "object") {
      return {
        ok: false,
        unavailable: true,
        table: "erp_core_organization",
        blockers: [{ reason: "ERP Core organization database is unavailable" }],
        error: "HRMS save blocked because ERP Core organization data could not be loaded. Start ERP Core and retry."
      };
    }

    const entities = new Map(
      array(organization.entities)
        .map(record => [text(record?.entity_id), record])
        .filter(([id]) => Boolean(id))
    );
    const locations = new Map(
      array(organization.locations)
        .map(record => [text(record?.id), record])
        .filter(([id]) => Boolean(id))
    );
    const blockers = [];

    for (const reference of organizationReferences(snapshot)) {
      const parent = reference.reference_type === "entity"
        ? entities.get(reference.reference_id)
        : locations.get(reference.reference_id);
      if (!parent || inactive(parent)) {
        blockers.push({
          ...reference,
          reason: !parent
            ? `ERP Core ${reference.reference_type} does not exist`
            : `ERP Core ${reference.reference_type} is inactive`
        });
        continue;
      }
      if (reference.reference_type === "location" && reference.paired_entity_id) {
        const locationEntityId = text(parent.parentCode || parent.record?.parent_entity_id || parent.record?.entity_id);
        if (locationEntityId && locationEntityId !== reference.paired_entity_id) {
          blockers.push({
            ...reference,
            reason: `ERP Core location belongs to entity ${locationEntityId}, not ${reference.paired_entity_id}`
          });
        }
      }
    }

    if (!blockers.length) return { ok: true, blockers: [] };
    return {
      ok: false,
      table: blockers[0].table,
      blockers,
      error: `HRMS save blocked. Restore or reassign invalid ERP Core organization references first: ${[
        ...new Set(blockers.map(blocker => blocker.reference_id))
      ].join(", ")}.`
    };
  }

  return {
    needsOrganizationSnapshot,
    organizationReferences,
    validateAgainstOrganization
  };
});
