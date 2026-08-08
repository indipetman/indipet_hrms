const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const Integrity = require("../hrms-referential-integrity.cjs");
const server = fs.readFileSync(path.join(__dirname, "..", "server.mjs"), "utf8");

test("roster shift references must resolve to a policy owned by the same location", () => {
  const valid = Integrity.validateRosterShiftReferences({
    shift_policies: [{ policy_id: "SFP1", location_id: "LOC1" }],
    rosters: [{ roster_id: "RST1", location_id: "LOC1", assignments: [{ shift_id: "SFP1" }] }]
  });
  assert.deepEqual(valid, { ok: true, blockers: [] });

  const missing = Integrity.validateRosterShiftReferences({
    shift_policies: [],
    rosters: [{ roster_id: "RST1", location_id: "LOC1", assignments: [{ shift_id: "SFP404", shift_name: "Opening" }] }]
  });
  assert.equal(missing.ok, false);
  assert.equal(missing.blockers[0].reason, "Missing shift policy");
  assert.equal(missing.blockers[0].shift_id, "SFP404");

  const wrongLocation = Integrity.validateRosterShiftReferences({
    shift_policies: [{ policy_id: "SFP2", location_id: "LOC2" }],
    rosters: [{ roster_id: "RST1", location_id: "LOC1", open_slots: [{ policy_id: "SFP2" }] }]
  });
  assert.equal(wrongLocation.ok, false);
  assert.match(wrongLocation.blockers[0].reason, /LOC2/);
});

test("duplicate assignment references produce one actionable blocker", () => {
  const result = Integrity.validateRosterShiftReferences({
    shift_policies: [],
    rosters: [{
      roster_id: "RST1",
      location_id: "LOC1",
      assignments: [{ shift_id: "SFP404" }, { shift_id: "SFP404" }]
    }]
  });
  assert.equal(result.ok, false);
  assert.equal(result.blockers.length, 1);
});

test("the mock API validates full and table-level snapshots before Excel writes", () => {
  assert.match(server, /import HrmsReferentialIntegrity from "\.\/hrms-referential-integrity\.cjs"/);
  assert.match(server, /const currentSnapshot = readAllTables\(\);\s*const prospectiveSnapshot = \{ \.\.\.currentSnapshot, \.\.\.data \}/);
  assert.match(server, /validateHrmsReferences\(nextSnapshot\)/);
  assert.match(server, /Roster save blocked|referenceValidation\.error/);
});

test("family members cannot be persisted without their owning employee", () => {
  assert.deepEqual(Integrity.validateEmployeeFamilyReferences({
    employees: [{ employee_id: "E1" }],
    employee_family_members: [{ family_member_id: "FM1", employee_id: "E1" }]
  }), { ok: true, blockers: [] });
  const blocked = Integrity.validateEmployeeFamilyReferences({
    employees: [],
    employee_family_members: [{ family_member_id: "FM1", employee_id: "MISSING", member_name: "Test" }]
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.table, "employee_family_members");
  assert.match(blocked.error, /MISSING/);
});
