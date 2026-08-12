const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const connectivity = require("../hrms-erp-connectivity.cjs");
const integrity = require("../hrms-financial-year-integrity.cjs");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const organization = {
  financial_years: [{ financial_year_id: "FY-2026-27", start_date: "2026-04-01", end_date: "2027-03-31", status: "Open", is_current: "Yes" }]
};

test("HRMS resolves the current date range only from ERP Core Financial Year Master", () => {
  assert.equal(connectivity.currentFinancialYear(organization, "2026-08-12").financial_year_id, "FY-2026-27");
  assert.equal(connectivity.currentFinancialYear(organization, "2028-01-01"), null);
});

test("roster UI no longer calculates an April-March year locally", () => {
  const functionSource = html.slice(html.indexOf("function currentRosterFinancialYearRange"), html.indexOf("function rosterMonthFromOverviewFilter"));
  assert.match(functionSource, /erpData\.financial_years/);
  assert.match(functionSource, /financial_year_id/);
  assert.doesNotMatch(functionSource, /getMonth\(\) >= 3|04-01|03-31/);
});

test("HRMS persistence registers explicit Financial Year ownership on date-bound roots", () => {
  const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.mjs"), "utf8");
  for (const tableName of integrity.scopedTables.filter(name => name !== "module_rows")) {
    const tableStart = serverSource.indexOf(`${tableName}: {`);
    assert.notEqual(tableStart, -1, `${tableName} must be registered`);
    assert.match(serverSource.slice(tableStart, tableStart + 700), /financial_year_id/, `${tableName} must persist financial_year_id`);
  }
  assert.match(serverSource, /HrmsFinancialYearIntegrity\.stampAndValidate/);
  assert.match(serverSource, /pre-financial-year-scope/);
});
