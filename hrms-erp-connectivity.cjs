(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsErpConnectivity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const array = value => Array.isArray(value) ? value : [];
  const inactive = record => text(record?.status).toLowerCase() === "inactive";
  const snapshotTables = snapshot => Object.entries(snapshot || {})
    .filter(([, rows]) => Array.isArray(rows));

  function businessRecordCount(snapshot = {}) {
    return snapshotTables(snapshot).reduce((total, [, rows]) => total + rows.length, 0);
  }

  function activeTenant(organization = {}) {
    return array(organization.tenants).find(record => text(record?.tenant_id) && !inactive(record)) || null;
  }

  function primaryEntity(organization = {}, tenantId = "") {
    return array(organization.entities).find(record =>
      text(record?.entity_role).toLowerCase() === "primary"
      && !inactive(record)
      && (!tenantId || text(record?.tenant_id) === text(tenantId))
    ) || null;
  }

  function stampTenantOwnership(snapshot = {}, tenantId = "") {
    const expectedTenantId = text(tenantId);
    const scoped = { ...snapshot };
    for (const [tableName, rows] of snapshotTables(snapshot)) {
      scoped[tableName] = rows.map(record => {
        const next = { ...record, tenant_id: expectedTenantId };
        if (tableName === "employees" && next.record && typeof next.record === "object") {
          next.record = { ...next.record, tenant_id: expectedTenantId };
        }
        return next;
      });
    }
    return scoped;
  }

  function applyTenantOwnership(snapshot = {}, organization = null) {
    if (!businessRecordCount(snapshot)) return { ok: true, snapshot, tenant_id: "" };
    if (!organization || typeof organization !== "object") {
      return {
        ok: false,
        unavailable: true,
        code: "TENANT_CONTEXT_UNAVAILABLE",
        table: "erp_core_organization",
        blockers: [{ reason: "ERP Core tenant workspace is unavailable" }],
        error: "HRMS save blocked because ERP Core organization data could not be loaded, including the Tenant workspace. Start ERP Core and retry."
      };
    }
    const tenant = activeTenant(organization);
    if (!tenant) {
      return {
        ok: false,
        code: "TENANT_CONTEXT_REQUIRED",
        table: "tenants",
        blockers: [{ reason: "No active ERP Core tenant workspace exists" }],
        error: "HRMS save blocked because no active Tenant workspace exists in ERP Core."
      };
    }
    const tenantId = text(tenant.tenant_id);
    const primary = primaryEntity(organization, tenantId);
    if (!primary) {
      return {
        ok: false,
        code: "OWNER_CONTEXT_REQUIRED",
        table: "entities",
        tenant_id: tenantId,
        blockers: [{ reason: "Primary Entity is missing" }],
        error: "Create the Primary Entity in ERP Core before saving HRMS business records."
      };
    }
    const mismatch = snapshotTables(snapshot).flatMap(([tableName, rows]) => rows.map(record => ({ tableName, record })))
      .find(({ record }) => text(record?.tenant_id) && text(record.tenant_id) !== tenantId);
    if (mismatch) {
      return {
        ok: false,
        code: "TENANT_SCOPE_MISMATCH",
        table: mismatch.tableName,
        tenant_id: tenantId,
        blockers: [{ reason: "Record belongs to another Tenant workspace" }],
        error: `HRMS save blocked because ${mismatch.tableName} contains a record for another Tenant workspace.`
      };
    }
    return {
      ok: true,
      tenant_id: tenantId,
      primary_entity_id: text(primary.entity_id),
      snapshot: stampTenantOwnership(snapshot, tenantId)
    };
  }

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
    return businessRecordCount(snapshot) > 0;
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
    const ownership = applyTenantOwnership(snapshot, organization);
    if (!ownership.ok) return ownership;
    const tenantId = ownership.tenant_id;

    for (const reference of organizationReferences(ownership.snapshot)) {
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
      if (tenantId && text(parent.tenant_id) !== tenantId) {
        blockers.push({
          ...reference,
          reason: `ERP Core ${reference.reference_type} belongs to another Tenant workspace`
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
    activeTenant,
    applyTenantOwnership,
    businessRecordCount,
    needsOrganizationSnapshot,
    organizationReferences,
    primaryEntity,
    stampTenantOwnership,
    validateAgainstOrganization
  };
});
