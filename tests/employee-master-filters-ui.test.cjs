const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("Employee Master has compact primary filters and expandable advanced filters", () => {
  for (const id of [
    "moduleSearch",
    "moduleStatus",
    "employeeMasterFilterButton",
    "employeeMasterAdvancedFilters",
    "moduleReset",
    "moduleBulkDelete"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /employeeMasterSearchFilterMarkup\("employeeMasterEntityFilter"/);
  assert.match(html, /employeeMasterSearchFilterMarkup\("moduleLocation"/);
  assert.match(html, /class="employee-master-primary-filters"/);
  assert.match(html, /employee-master-advanced-filters \$\{employeeMasterAdvancedFiltersOpen \? "is-open" : ""\}/);
  assert.match(html, /employeeMasterAdvancedFiltersOpen = !employeeMasterAdvancedFiltersOpen/);
});

test("Employee Master uses consistent reset and selection delete icon actions", () => {
  assert.match(html, /id="moduleReset"[^>]*aria-label="Reset filters"[^>]*title="Reset filters"[^>]*><i data-lucide="rotate-ccw">/);
  assert.match(html, /id="moduleBulkDelete"[^>]*aria-label="Delete selected records"[^>]*hidden><i data-lucide="trash-2">/);
  assert.match(html, /\.employee-master-filter-actions \.module-filter-icon \{[\s\S]*width: 38px;[\s\S]*height: 38px;/);
  assert.match(html, /\["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\)/);
});

test("Employee Master paginates with a current-total indicator and selectable page size", () => {
  assert.match(html, /let employeeMasterPage = 1;/);
  assert.match(html, /let employeeMasterPageSize = 25;/);
  assert.match(html, /function renderEmployeeMasterPagination\(totalRecords = 0\)/);
  assert.match(html, /class="page-button is-current employee-master-page-indicator"[^>]*>\$\{employeeMasterPage\} \/ \$\{totalPages\}<\/button>/);
  assert.match(html, /data-employee-master-page-size/);
  assert.match(html, />25 \/ page<\/option>/);
  assert.match(html, /rows\.slice\(\(employeeMasterPage - 1\) \* employeeMasterPageSize, employeeMasterPage \* employeeMasterPageSize\)/);
  assert.match(html, /else if \(isEmployeeMaster\) renderEmployeeMasterPagination\(rows\.length\);/);
});

test("Employee Master bulk delete checks dependencies and waits for Excel acknowledgement", () => {
  assert.match(html, /hrmsDeleteDependencies\("employee", employeeId, sourceRecord\)/);
  assert.match(html, /requestHrmsDeletion\(\{ recordLabel, dependencies: \[\.\.\.new Set\(dependencies\)\] \}\)/);
  assert.match(html, /delete employeeRecordDetails\[employeeId\]/);
  assert.match(html, /persistHrmsDeletionOrRestore\(beforeDeleteSnapshot, \(\) => renderModule\("employee-master"\)\)/);
});

test("Employee Master exports filtered role-scoped rows using only visible columns", () => {
  assert.match(html, /function filteredEmployeeMasterRowsForExport\(\)/);
  assert.match(html, /return hrmsScopedEmployeeRows\(\)\.filter\(row =>/);
  assert.match(html, /employeeMasterRowMatchesFilters\(row, state, true\)/);
  assert.match(html, /function employeeMasterExportDataset/);
  assert.match(html, /const columns = visibleEmployeeMasterColumns\(\)/);
  assert.match(html, /headers: columns\.map\(column => column\.label\)/);
  assert.match(html, /rows: rows\.map\(row => columns\.map\(column => employeeMasterExportValue\(row, column\)\)\)/);
  assert.doesNotMatch(html.slice(html.indexOf("function employeeMasterExportDataset"), html.indexOf("function employeeMasterExportFileName")), /Action/);
});

test("Employee Master Export opens the shared Excel and PDF format menu", () => {
  assert.match(html, /activePage === "employee-master"\) \{\s*openExportFormatMenu\(\{ context: "employee-master" \}\)/);
  assert.match(html, /exportContext === "employee-master"\) runEmployeeMasterExport\(format\)/);
  assert.match(html, /exportRosterDatasetExcel\(dataset, employeeMasterExportFileName\("xlsx"\), "Employee Master"\)/);
  assert.match(html, /exportRosterDatasetPdf\(dataset, \{/);
  assert.match(html, /widths: employeeMasterPdfWidths\(dataset\.columns\)/);
});

test("large delete blocker lists stay inside a viewport-safe scrollable dialog", () => {
  assert.match(html, /\.modal\.delete-integrity-modal \{[\s\S]*display: flex;[\s\S]*max-height: calc\(100dvh - 40px\);/);
  assert.match(html, /\.delete-integrity-body \{[\s\S]*min-height: 0;[\s\S]*overflow: hidden;/);
  assert.match(html, /\.delete-integrity-dependencies \{[\s\S]*max-height: min\(360px, 45vh\);[\s\S]*overflow-y: auto;/);
  assert.match(html, /dependencies\.length} blocker\$\{dependencies\.length === 1 \? "" : "s"} found/);
  assert.match(html, /list\.scrollTop = 0;/);
});

test("Employee Master provides the agreed advanced workforce filters", () => {
  for (const id of [
    "employeeMasterDepartmentFilter",
    "employeeMasterDesignationFilter",
    "employeeMasterCategoryFilter",
    "employeeMasterRoleFilter"
  ]) {
    assert.match(html, new RegExp(`employeeMasterSearchFilterMarkup\\("${id}"`));
  }
  for (const id of [
    "employeeMasterEmploymentTypeFilter",
    "employeeMasterSalesFilter",
    "employeeMasterProfileFilter",
    "employeeMasterDocumentFilter",
    "employeeMasterJoiningFilter"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("large Employee Master filters use styled searchable combobox controls", () => {
  assert.match(html, /function employeeMasterSearchFilterMarkup/);
  assert.match(html, /role="combobox" aria-autocomplete="list"/);
  assert.match(html, /class="employee-master-filter-results"/);
  assert.match(html, /function configureEmployeeMasterSearchFilter/);
  assert.match(html, /input\.addEventListener\("input", \(\) => openResults\(input\.value\)\)/);
  assert.match(html, /\["employeeMasterDesignationFilter", designations, "All designations", "designation"\]/);
  assert.doesNotMatch(html, /employeeMasterDatalist/);
});

test("searchable Employee Master filters support multiple selections", () => {
  assert.match(html, /aria-multiselectable="true"/);
  assert.match(html, /function employeeMasterMultiFilterValues/);
  assert.match(html, /selectedValues\.includes\(value\) \? selectedValues\.filter/);
  assert.match(html, /employeeMasterFilterState\[stateKey\] = selectedValues/);
  assert.match(html, /function employeeMasterMultiFilterMatches/);
  assert.match(html, /employeeMasterMultiFilterMatches\(employeeMasterColumnValue\(row, "designation"\), state\.designation\)/);
  assert.match(html, /employeeMasterFilterToReopen = id/);
});

test("Employee Master filters are applied to role-scoped rows and reset together", () => {
  assert.match(html, /const scopedRows = isEmployeeMaster \? hrmsScopedEmployeeRows\(\) : hrmsScopedModuleRows\(pageKey\)/);
  assert.match(html, /employeeMasterRowMatchesFilters\(row, employeeMasterFilterState, false\)/);
  assert.match(html, /employeeMasterRowMatchesFilters\(row, employeeMasterFilterState, true\)/);
  assert.match(html, /function employeeMasterJoiningPeriodMatches/);
  assert.match(html, /employeeMasterFilterState = defaultEmployeeMasterFilterState\(\)/);
  assert.match(html, /employeeMasterAdvancedFiltersOpen = false/);
  assert.match(html, /employeeMasterSkipNextFilterCapture = true;\s*renderModule\("employee-master"\)/);
  assert.match(html, /if \(employeeMasterSkipNextFilterCapture\) employeeMasterSkipNextFilterCapture = false;\s*else captureEmployeeMasterFilterState\(\)/);
});

test("Employee Master filter layout remains responsive", () => {
  assert.match(html, /\.employee-master-primary-filters \{[\s\S]*grid-template-columns:/);
  assert.match(html, /\.employee-master-advanced-filters \{[\s\S]*grid-template-columns: repeat\(4, minmax\(150px, 1fr\)\)/);
  assert.match(html, /@container \(max-width: 900px\)[\s\S]*\.employee-master-primary-filters,[\s\S]*\.employee-master-advanced-filters/);
  assert.match(html, /@container \(max-width: 620px\)[\s\S]*\.employee-master-primary-filters,[\s\S]*\.employee-master-advanced-filters/);
});

test("searchable and select filters use one typography system", () => {
  assert.match(
    html,
    /\.employee-master-view \.filter-select,\s*\.employee-master-filter-input \{[\s\S]*font-family: inherit;[\s\S]*font-size: 10\.5px;[\s\S]*font-weight: 600;[\s\S]*line-height: normal;/
  );
  assert.match(
    html,
    /\.employee-master-filter-input::placeholder \{[\s\S]*color: var\(--text-secondary\);[\s\S]*font: inherit;[\s\S]*opacity: 1;/
  );
});
