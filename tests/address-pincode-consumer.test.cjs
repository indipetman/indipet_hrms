const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectDir = path.resolve(__dirname, "..");
const workspaceDir = path.resolve(projectDir, "..");
const html = fs.readFileSync(path.join(projectDir, "hrms_dashboard_nav_visual.html"), "utf8");

test("HRMS consumes ERP Core PIN lookup for location, entity, and employee addresses", () => {
  for (const prefix of ["location", "entity", "employee"]) {
    assert.match(html, new RegExp(`data-hrms-pincode-scope="${prefix}"`));
  }
  assert.match(html, /data-location-field="district" data-hrms-pincode-district/);
  assert.match(html, /data-entity-field="district" data-hrms-pincode-district/);
  assert.match(html, /data-employee-field="address_district" data-hrms-pincode-district/);
  assert.match(html, /hrmsErpCoreGeographyApiBaseUrl/);
  assert.match(html, /fetchHrmsPincodeLookup/);
  assert.match(html, /\/pincodes\/\$\{encodeURIComponent\(pincode\)\}/);
  assert.match(html, /function hrmsDistrictDisplayName\(value\)/);
  assert.match(html, /match\.districts \|\| \[\]\)\.map\(hrmsDistrictDisplayName\)/);
  assert.doesNotMatch(html, /City\/District/);
});

test("all new HRMS district values remain inside their owning persisted records", () => {
  assert.match(html, /\$\$\("\[data-location-field\]"\)\.reduce/);
  assert.match(html, /record: \{ \.\.\.record \}/);
  assert.match(html, /\$\$\("\[data-entity-field\]"\)\.reduce/);
  assert.match(html, /\$\$\("\[data-employee-field\]"\)\.reduce/);
  assert.match(html, /normalizeEmployeeDetailRecord\([\s\S]*\.\.\.detail/);
});

test("the Next.js handoff is generated from the current HRMS source and includes PIN-first fields", () => {
  const migration = fs.readFileSync(path.join(workspaceDir, "indipet-hrms-next", "scripts", "migrate-prototype.mjs"), "utf8");
  const markup = fs.readFileSync(path.join(workspaceDir, "indipet-hrms-next", "src", "prototype", "hrms-markup.html"), "utf8");
  const runtime = fs.readFileSync(path.join(workspaceDir, "indipet-hrms-next", "public", "hrms-runtime.js"), "utf8");
  assert.match(migration, /"indipet_hrms", "hrms_dashboard_nav_visual\.html"/);
  assert.match(markup, /data-employee-field="address_district" data-hrms-pincode-district/);
  assert.match(markup, /data-hrms-pincode-scope="location"/);
  assert.match(runtime, /async function fetchHrmsPincodeLookup/);
  assert.match(runtime, /function hrmsDistrictDisplayName\(value\)/);
});
