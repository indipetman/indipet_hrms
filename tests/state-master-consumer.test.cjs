const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "hrms_dashboard_nav_visual.html"),
  "utf8"
);

test("HRMS consumes State Master from the ERP Core snapshot only", () => {
  assert.doesNotMatch(source, /defaultStateMasters/);
  assert.match(source, /state_masters:\s*Array\.isArray\(erpData\.state_masters\)/);
  assert.match(source, /entity_gst_registrations:\s*Array\.isArray\(erpData\.entity_gst_registrations\)/);
  assert.match(source, /return \{ \.\.\.\(hrmsData \|\| \{\}\), entity_gst_registrations: \[\], entity_tax_registrations: \[\], franchise_agreements: \[\], state_masters: \[\] \};/);
  assert.doesNotMatch(source, /state_masters:\s*stateMasters\.map/);
});

test("HRMS rejects entity and location states missing from ERP Core", () => {
  assert.match(source, /State Master is unavailable or the selected state is no longer active\./);
});

test("Employee Address uses the shared ERP Core State Master", () => {
  assert.match(source, /<select data-employee-field="address_state" data-hrms-pincode-state><option value="">Select state<\/option><\/select>/);
  assert.doesNotMatch(source, /<input data-employee-field="address_state"/);
  assert.match(source, /select\[data-employee-field="address_state"\]/);
  assert.match(source, /Select an active state from ERP Core State Master\./);
  assert.match(source, /if \(field\.dataset\.employeeField === "address_state"\) \{[\s\S]*populateDistrictMasterSelect\("employee"\);[\s\S]*populateCityMasterSelect\("employee"\);/);
});
