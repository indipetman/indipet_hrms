const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("Designation Master summary cards use relevant icons", () => {
  assert.match(html, /genericPage\("Designation Master"[\s\S]*?\["Designations", "Keyholder Eligible", "Highest Grade"\]/);
  assert.match(html, /summaryIcons: \[[\s\S]*?icon: "badge"[\s\S]*?icon: "key-round"[\s\S]*?icon: "award"/);
  assert.match(html, /notes: \["Configured job titles", "Designations eligible to hold keys", "Highest configured authority grade"\]/);
});

test("Designation Master reveals protected bulk delete for selected rows", () => {
  assert.match(
    html,
    /const supportsBulkDelete = \["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\);/
  );
  assert.match(
    html,
    /if \(!\["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\)/
  );
  assert.match(html, /if \(activePage === "designation-master"\) \{[\s\S]*?hrmsDeleteDependencies\("designation", designationId/);
  assert.match(
    html,
    /if \(activePage === "designation-master"\) \{[\s\S]*?persistHrmsDeletionOrRestore\(beforeDeleteSnapshot, \(\) => renderModule\("designation-master"\)\)/
  );
});

test("Designation Master export uses current role scope and table filters", () => {
  assert.match(html, /function filteredDesignationMasterRowsForExport\(\)/);
  assert.match(html, /return hrmsScopedModuleRows\("designation-master"\)\.filter/);
  assert.match(html, /\(!search \|\| rowText\.includes\(search\)\)/);
  assert.match(html, /\(location === "all" \|\| rowLocation === location\)/);
  assert.match(html, /\(status === "all" \|\| rowStatus === status\)/);
  assert.match(html, /const headers = \[\.\.\.\(pageConfig\["designation-master"\]\?\.columns \|\| \[\]\)\];/);
});

test("Designation Master Export button offers Excel and PDF downloads", () => {
  assert.match(html, /if \(activePage === "designation-master"\) \{\s*openExportFormatMenu\(\{ context: "designation-master" \}\);/);
  assert.match(html, /else if \(exportContext === "designation-master"\) runDesignationMasterExport\(format\);/);
  assert.match(html, /function runDesignationMasterExport\(format = "excel"\)/);
  assert.match(html, /exportRosterDatasetExcel\(dataset, designationMasterExportFileName\("xlsx"\), "Designation Master"\)/);
  assert.match(html, /title: "Designation Master"/);
  assert.match(html, /fileName: designationMasterExportFileName\("pdf"\)/);
});

test("Designation Master Export reports empty filtered results instead of creating a blank file", () => {
  assert.match(html, /showToast\("No designation records match the current filters\.", "error"\);/);
});
