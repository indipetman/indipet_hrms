const test = require("node:test");
const assert = require("node:assert/strict");
const { effectivePermissionCodes } = require("../role-permission-resolver.cjs");

test("a revoked matrix permission is not restored by stale saved permission codes", () => {
  const permissions = {
    "HRMS Shift & Roster": {
      "Roster Board": { View: true, Create: false, Edit: false, Delete: false, Export: false }
    }
  };
  const record = {
    permission_codes: [
      "HRMS_SHIFT_ROSTER.ROSTER_BOARD.VIEW",
      "HRMS_SHIFT_ROSTER.ROSTER_BOARD.EDIT"
    ]
  };

  assert.deepEqual(effectivePermissionCodes(record, permissions), ["HRMS_SHIFT_ROSTER.ROSTER_BOARD.VIEW"]);
});

test("legacy code-only roles still work when no permission matrix exists", () => {
  const record = { permission_codes: ["HRMS_EMPLOYEES.EMPLOYEE_MASTER.VIEW"] };

  assert.deepEqual(effectivePermissionCodes(record, {}), ["HRMS_EMPLOYEES.EMPLOYEE_MASTER.VIEW"]);
});
