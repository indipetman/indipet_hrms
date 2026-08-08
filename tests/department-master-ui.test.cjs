const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("Department Master uses fixed columns without a Columns control", () => {
  assert.match(html, /const isDepartmentMaster = pageKey === "department-master";/);
  assert.match(
    html,
    /\$\("#columnButton"\)\.style\.display = isDepartmentMaster \|\| isLeaveRequest \|\| isAttendancePolicy \|\| isLeavePolicy \|\| isLeaveLedger \|\| isHolidayCalendar \? "none" : "";/
  );
});

test("Department Master reveals bulk delete for selected rows and uses the protected delete workflow", () => {
  assert.match(
    html,
    /const supportsBulkDelete = \["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\);/
  );
  assert.match(
    html,
    /if \(!\["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\)/
  );
  assert.match(html, /if \(activePage === "department-master"\) \{[\s\S]*?hrmsDeleteDependencies\("department", departmentId/);
  assert.match(html, /mappedDesignationsForDepartment\(row\)/);
  assert.match(
    html,
    /if \(activePage === "department-master"\) \{[\s\S]*?persistHrmsDeletionOrRestore\(beforeDeleteSnapshot, \(\) => renderModule\("department-master"\)\)/
  );
});

test("Department Master summary cards use relevant icons and relationship-aware values", () => {
  assert.match(html, /labels: \["Departments", "Employees Mapped", "Services Linked"\]/);
  assert.match(html, /summaryIcons: \[[\s\S]*?icon: "building-2"[\s\S]*?icon: "users"[\s\S]*?icon: "link-2"/);
  assert.match(html, /const employeeMappedCount = hrmsScopedEmployeeRows\(\)\.filter/);
  assert.match(html, /const serviceLinkedCount = erpServiceRecords\.filter/);
  assert.match(html, /pageConfig\[pageKey\]\.values = \[[\s\S]*?String\(departments\.length\),[\s\S]*?String\(employeeMappedCount\),[\s\S]*?String\(serviceLinkedCount\)/);
});

test("Department Master reads linked services from the ERP-owned Excel API", () => {
  assert.match(html, /const hrmsErpBusinessApiBaseUrl = `http:\/\/\$\{window\.location\.hostname \|\| "localhost"\}:4317\/api\/mock-db`;/);
  assert.match(html, /async function fetchHrmsErpServiceRecords\(\)/);
  assert.match(html, /erpServiceRecords\.splice\(0, erpServiceRecords\.length, \.\.\.data\.services\)/);
  assert.match(html, /Promise\.all\(\[[\s\S]*?fetchHrmsErpCoreReserve\(\),[\s\S]*?fetchHrmsErpServiceRecords\(\)/);
});

test("Department Head only lists designations linked to that department", () => {
  assert.match(html, /function designationMasterOptions\(departmentName = ""\)/);
  assert.match(html, /\.filter\(row => normalizedDepartment && String\(row\[2\] \|\| ""\)\.trim\(\)\.toLowerCase\(\) === normalizedDepartment\)/);
  assert.match(html, /function syncDepartmentHeadOptions\(departmentName = "", selectedHead = ""\)/);
  assert.match(html, /syncDepartmentHeadOptions\(row\[1\] \|\| "", row\[2\] === "Not assigned"/);
});

test("Department Master export uses the current role scope and table filters", () => {
  assert.match(html, /function filteredDepartmentMasterRowsForExport\(\)/);
  assert.match(html, /return hrmsScopedModuleRows\("department-master"\)\.filter/);
  assert.match(html, /\(!search \|\| rowText\.includes\(search\)\)/);
  assert.match(html, /\(location === "all" \|\| rowLocation === location\)/);
  assert.match(html, /\(status === "all" \|\| rowStatus === status\)/);
  assert.match(html, /const headers = \[\.\.\.\(pageConfig\["department-master"\]\?\.columns \|\| \[\]\)\];/);
});

test("Department Master Export button offers working Excel and PDF downloads", () => {
  assert.match(html, /if \(activePage === "department-master"\) \{\s*openExportFormatMenu\(\{ context: "department-master" \}\);/);
  assert.match(html, /else if \(exportContext === "department-master"\) runDepartmentMasterExport\(format\);/);
  assert.match(html, /function runDepartmentMasterExport\(format = "excel"\)/);
  assert.match(html, /exportRosterDatasetExcel\(dataset, departmentMasterExportFileName\("xlsx"\), "Department Master"\)/);
  assert.match(html, /exportRosterDatasetPdf\(dataset, \{/);
  assert.match(html, /title: "Department Master"/);
  assert.match(html, /fileName: departmentMasterExportFileName\("pdf"\)/);
});
