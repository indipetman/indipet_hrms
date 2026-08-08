const test = require("node:test");
const assert = require("node:assert/strict");
const { employeeAllowed, fromSession, locationAllowed, recordAllowed, resolveRecordContext } = require("../hrms-session-scope.cjs");

const locations = [
  { id: "IPL101-NDP001", listName: "TEST LOCATION 01", parentCode: "IPL101" },
  { id: "SOU0001-FRN001", listName: "FRAN TEST LOC 1", parentCode: "SOU0001" }
];

test("franchisee data scope only includes its entity and mapped locations", () => {
  const scope = fromSession({
    role_id: "FRA0001",
    entity_id: "SOU0001",
    access_entity_id: "SOU0001",
    access_location_id: "ALL_MAPPED"
  });

  assert.equal(locationAllowed(locations[0], scope), false);
  assert.equal(locationAllowed(locations[1], scope), true);
  assert.equal(employeeAllowed({ employee: { parent_entity_id: "IPL101", location_id: "IPL101-NDP001" }, locations, scope }), false);
  assert.equal(employeeAllowed({ employee: { parent_entity_id: "SOU0001", location_id: "SOU0001-FRN001" }, locations, scope }), true);
});

test("a specific location assignment narrows an entity scope", () => {
  const scope = fromSession({
    role_id: "FRA0001",
    entity_id: "SOU0001",
    access_entity_id: "SOU0001",
    access_location_id: "SOU0001-FRN002"
  });

  assert.equal(locationAllowed(locations[1], scope), false);
});

test("system admin remains unrestricted", () => {
  const scope = fromSession({ role_id: "ADM0001", is_system_admin: true });

  assert.equal(employeeAllowed({ employee: { parent_entity_id: "IPL101" }, locations, scope }), true);
  assert.equal(employeeAllowed({ employee: { parent_entity_id: "SOU0001" }, locations, scope }), true);
});

const employees = [
  { employee_id: "IPL101-NDP-E1528", employee_name: "Joy Das", parent_entity_id: "IPL101", location_id: "IPL101-NDP001" },
  { employee_id: "SOU0001-FRN-E1534", employee_name: "Chinmoy Ghosh", parent_entity_id: "SOU0001", location_id: "SOU0001-FRN001" }
];

test("employee-owned records are resolved from legacy request cells", () => {
  const context = resolveRecordContext({
    record: { cells: ["LR-RST-SOU0001-FRN001-SOU0001-FRN-E1534-2026-07-30", "Chinmoy Ghosh"] },
    employees,
    locations
  });

  assert.equal(context.employeeId, "SOU0001-FRN-E1534");
  assert.equal(context.locationId, "SOU0001-FRN001");
  assert.equal(context.entityId, "SOU0001");
});

test("employee-owned records are isolated between entities", () => {
  const scope = fromSession({
    role_id: "FRA0001",
    entity_id: "SOU0001",
    access_entity_id: "SOU0001",
    access_location_id: "ALL_MAPPED"
  });

  assert.equal(recordAllowed({ record: { employee_id: "SOU0001-FRN-E1534" }, policy: "employee", employees, locations, scope }), true);
  assert.equal(recordAllowed({ record: { employee_id: "IPL101-NDP-E1528" }, policy: "employee", employees, locations, scope }), false);
});

test("tenant-owned future records fail closed without ownership metadata", () => {
  const scope = fromSession({ role_id: "FRA0001", entity_id: "SOU0001", access_entity_id: "SOU0001" });

  assert.equal(recordAllowed({ record: { cells: ["Unknown record"] }, policy: "entity", employees, locations, scope }), false);
  assert.equal(recordAllowed({ record: { cells: ["Shared definition"] }, policy: "global", employees, locations, scope }), true);
});
