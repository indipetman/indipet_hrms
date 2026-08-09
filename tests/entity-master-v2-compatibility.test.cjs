const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("HRMS Entity Master exposes V2 legal identity fields and retires embedded commercial terms", () => {
  for (const field of [
    "trade_name", "registration_type", "registration_number", "incorporation_date",
    "business_commencement_date", "pan_number", "tan_number", "legal_status",
    "status_effective_from", "closure_date", "closure_reason"
  ]) assert.match(source, new RegExp(`data-entity-field="${field}"`));
  assert.doesNotMatch(source, /data-entity-field="cin_number"/);
  assert.doesNotMatch(source, /data-entity-field="commission_on_(?:products|services)"/);
  assert.match(source, /<option value="LLP">LLP<\/option>/);
  assert.match(source, /<option value="HUF">HUF<\/option>/);
});

test("HRMS writes entity, GST, TAN and location records to ERP Core atomically", () => {
  assert.match(source, /async function persistHrmsErpCoreBatch\(tables\)/);
  assert.match(source, /entity_gst_registrations: snapshot\.entity_gst_registrations/);
  assert.match(source, /entity_tax_registrations: snapshot\.entity_tax_registrations/);
  assert.match(source, /locations: snapshot\.locations/);
  assert.match(source, /Number\(acknowledgement\?\.counts\?\.\[table\]\) === rows\.length/);
});

test("HRMS retains the stable ERP identifiers used by employees and payroll", () => {
  assert.match(source, /entity_id: row\[0\]/);
  assert.match(source, /entity_role: normalizeEntityRole\(row\[3\]\)/);
  assert.match(source, /parent_entity_id/);
  assert.match(source, /entityMasterDetails\[entity\.entity_id\]/);
  assert.match(source, /access:\s*\{[\s\S]*user_id: details\.user_id/);
});
