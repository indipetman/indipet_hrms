const test = require("node:test");
const assert = require("node:assert/strict");
const {
  needsOrganizationSnapshot,
  organizationReferences,
  validateAgainstOrganization
} = require("../hrms-erp-connectivity.cjs");

const organization = {
  entities: [
    { entity_id: "ENT-1", status: "Active" },
    { entity_id: "ENT-X", status: "Inactive" }
  ],
  locations: [
    { id: "LOC-1", parentCode: "ENT-1", status: "Active" },
    { id: "LOC-X", parentCode: "ENT-1", status: "Inactive" }
  ]
};

test("HRMS organization references cover ERP-owned entity and location keys", () => {
  const snapshot = {
    employees: [{ employee_id: "E1", record: { parent_entity_id: "ENT-1", location_id: "LOC-1" } }],
    attendance: [{ id: "A1", entity_id: "ENT-1", location_id: "LOC-1" }],
    leave_policies: [{ policy_id: "LP1", organization_id: "ENT-1" }],
    shift_policies: [{ policy_id: "SP1", location_id: "LOC-1" }],
    rosters: [{ roster_id: "R1", location_id: "LOC-1" }],
    operating_contexts: [{ context_id: "CTX1", primary_entity_id: "ENT-1", active_entity_id: "ENT-1" }]
  };
  const references = organizationReferences(snapshot);
  assert.equal(needsOrganizationSnapshot(snapshot), true);
  assert.equal(references.some(reference => reference.table === "employees" && reference.reference_type === "entity"), true);
  assert.equal(references.some(reference => reference.table === "shift_policies" && reference.reference_type === "location"), true);
  assert.equal(validateAgainstOrganization(snapshot, organization).ok, true);
});

test("HRMS saves fail closed when ERP Core cannot be reached", () => {
  const snapshot = { employees: [{ employee_id: "E1", record: { parent_entity_id: "ENT-1" } }] };
  const result = validateAgainstOrganization(snapshot, null);
  assert.equal(result.ok, false);
  assert.equal(result.unavailable, true);
  assert.match(result.error, /ERP Core organization data could not be loaded/);
});

test("missing, inactive and cross-entity ERP references are rejected", () => {
  const snapshot = {
    employees: [
      { employee_id: "E-MISSING", record: { parent_entity_id: "ENT-404", location_id: "LOC-404" } },
      { employee_id: "E-INACTIVE", record: { parent_entity_id: "ENT-X", location_id: "LOC-X" } },
      { employee_id: "E-MISMATCH", record: { parent_entity_id: "ENT-OTHER", location_id: "LOC-1" } }
    ]
  };
  const result = validateAgainstOrganization(snapshot, organization);
  assert.equal(result.ok, false);
  assert.equal(result.blockers.some(blocker => blocker.reference_id === "ENT-404" && /does not exist/.test(blocker.reason)), true);
  assert.equal(result.blockers.some(blocker => blocker.reference_id === "ENT-X" && /inactive/.test(blocker.reason)), true);
  assert.equal(result.blockers.some(blocker => blocker.reference_id === "LOC-1" && /belongs to entity ENT-1/.test(blocker.reason)), true);
});

test("empty HRMS databases do not require an ERP round trip", () => {
  assert.equal(needsOrganizationSnapshot({ employees: [], rosters: [], module_rows: [] }), false);
});
