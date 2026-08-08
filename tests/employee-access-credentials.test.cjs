const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "hrms_dashboard_nav_visual.html"),
  "utf8"
);
const serverSource = fs.readFileSync(
  path.resolve(__dirname, "..", "server.mjs"),
  "utf8"
);

test("Employee Access provides matching password controls with independent eye buttons", () => {
  assert.match(source, /id="employeeLoginPassword" data-employee-field="login_password" type="password"/);
  assert.match(source, /id="employeeConfirmPassword" data-employee-confirm-password type="password"/);
  assert.match(source, /data-password-target="employeeLoginPassword"/);
  assert.match(source, /data-password-target="employeeConfirmPassword"/);
  assert.match(source, /function setEmployeePasswordVisibility\(button, visible\)/);
  assert.match(source, /data-lucide="\$\{visible \? "eye-off" : "eye"\}"/);
});

test("Employee credentials are complete, matching and globally unique", () => {
  assert.match(source, /Login ID, Role ID, Password and Confirm Password are all required for employee access\./);
  assert.match(source, /Employee login password must contain at least 6 characters\./);
  assert.match(source, /Password and Confirm Password must match\./);
  assert.match(source, /function employeeLoginIdConflict\(loginId, excludeEmployeeId = ""\)/);
  assert.match(source, /This Login ID is already assigned to another ERP or HRMS login\./);
});

test("only the employee password is persisted and it reloads through the Excel record JSON", () => {
  assert.match(source, /employees: pageConfig\["employee-master"\]\.rows\.map\(row => \(\{[\s\S]*?record: \{[\s\S]*?employeeRecordDetails/);
  assert.match(serverSource, /employees:\s*\{[\s\S]*?headers: \["employee_id", "employee_name", "location", "designation", "profile_status", "status", "record"\]/);
  assert.match(source, /\$\("#employeeConfirmPassword"\)\.value = record\.login_password \|\| ""/);
  assert.doesNotMatch(source, /data-employee-field="confirm_password"/);
});

test("saved employee credentials authenticate with current role and location scope", () => {
  assert.match(source, /function employeeLoginCredential\(userId, password\)/);
  assert.match(source, /access_entity_id: employee\.parent_entity_id/);
  assert.match(source, /access_location_id: employee\.location_id \|\| "ALL_MAPPED"/);
  assert.match(source, /source: "employee"/);
  assert.match(source, /const employeeCredential = employeeLoginCredential\(user, password\)/);
  assert.match(source, /if \(sharedErpHasLoginCredentials\(\) \|\| employeeHasLoginCredentials\(\)\)/);
  assert.match(source, /if \(session\.source === "employee" \|\| session\.employee_id\)/);
  assert.match(source, /if \(session\.authorization_invalid\) return false/);
});

test("new employees start with a neutral Legal Entity while edits retain the saved assignment", () => {
  assert.match(source, /populateRegisteredEntitySelects\(\);\s*setEmployeeFieldValue\("parent_entity_id", ""\);\s*populateStateMasterSelects\(\);/);
  assert.match(source, /function populateEmployeeFormValues\(record = \{\}\)[\s\S]*?setEmployeeFieldValue\("parent_entity_id", record\.parent_entity_id \|\| ""\)/);
  assert.match(source, /<option value="">Select legal entity<\/option>/);
});
