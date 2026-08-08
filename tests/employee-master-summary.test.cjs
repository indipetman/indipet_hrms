const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");

test("Employee Master renders the agreed five workforce cards", () => {
  assert.match(html, /labels: \["Active Employees", "Profile Complete", "Documents Verified", "New Joiners", "Sales-Eligible Employees"\]/);
  assert.match(html, /summaryIcons: \[[\s\S]*?user-check[\s\S]*?circle-check-big[\s\S]*?shield-check[\s\S]*?user-plus[\s\S]*?briefcase-business/);
  assert.match(html, /\.module-summary\.employee-summary-grid,[\s\S]*?grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(html, /moduleSummary\.classList\.toggle\("employee-summary-grid", pageKey === "employee-master"\)/);
});

test("Employee Master is the first option in the Employees menu", () => {
  assert.match(html, /data-group="employees"[\s\S]*?<div class="nav-children-inner">\s*<button class="nav-child" data-page="employee-master">Employee Master<\/button>\s*<button class="nav-child" data-page="department-master">Department Master<\/button>\s*<button class="nav-child" data-page="designation-master">Designation Master<\/button>/);
});

test("Employee Master card values are derived from live employee records", () => {
  assert.match(html, /function updateEmployeeMasterValues\(employeeRows = pageConfig\["employee-master"\]\.rows\) \{[\s\S]*?activeRows[\s\S]*?profileComplete[\s\S]*?documentsVerified[\s\S]*?newJoiners[\s\S]*?salesEligible/);
  assert.match(html, /function employeeHasVerifiedIdentityDocuments\(employeeId\)[\s\S]*?\["aadhaar", "pan"\]\.every[\s\S]*?verification_status/);
  assert.match(html, /function employeeJoinedInCurrentMonth\(employeeId, now = new Date\(\)\)[\s\S]*?date_of_joining/);
  assert.match(html, /employeeRecordDetails\[row\[0\]\]\?\.is_salesperson/);
  assert.match(html, /if \(pageKey === "employee-master"\) updateEmployeeMasterValues\(scopedRows\);/);
  assert.doesNotMatch(html, /if \(pageKey === "employee-master"\) \{\s*config\.values = \[/);
});

test("Employee Master ratios use active employees as the correct denominator", () => {
  assert.match(html, /`\$\{activeRows\.length\} \/ \$\{rows\.length\}`/);
  assert.match(html, /`\$\{profileComplete\} \/ \$\{activeRows\.length\}`/);
  assert.match(html, /`\$\{documentsVerified\} \/ \$\{activeRows\.length\}`/);
});

test("Employee Master provides the agreed configurable columns with a fixed Action column", () => {
  assert.match(html, /columns: \["Employee", "Employee ID", "Legal Entity", "Assigned Location", "Department", "Designation", "Employee Category", "Reporting Manager", "Mobile Number", "Email Address", "Login ID", "Role", "Date of Joining", "Employment Type", "Sales Eligible", "Profile Completion", "Document Verification", "Status"\]/);
  assert.match(html, /const employeeMasterColumnDefinitions = \[[\s\S]*?\{ key: "employee", label: "Employee", locked: true \}[\s\S]*?\{ key: "status", label: "Status" \}/);
  assert.match(html, /Action stays fixed/);
  assert.doesNotMatch(html, /employeeMasterColumnDefinitions = \[[\s\S]*?key: "action"/);
  assert.match(html, /pageKey === "employee-master" \? employeeTableColumns\.map\(column => `<td>\$\{employeeMasterColumnCell\(row, column\)\}<\/td>`\)/);
});

test("Employee Master reuses the compact established column organizer controls", () => {
  assert.match(html, /data-employee-master-column-item="\$\{item\.key\}"/);
  assert.match(html, /<label class="entity-column-check"><input type="checkbox" data-employee-master-column-visible/);
  assert.match(html, /<span class="entity-column-move">[\s\S]*data-employee-master-column-move="up"[\s\S]*data-employee-master-column-move="down"/);
  assert.match(html, /\.entity-column-item \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 61px/);
  assert.match(html, /\.entity-column-move \{[\s\S]*?grid-template-columns: repeat\(2, 28px\)[\s\S]*?width: 61px/);
  assert.match(html, /\.entity-column-move button svg \{[\s\S]*?width: 17px[\s\S]*?height: 17px/);
  assert.doesNotMatch(html, /entity-column-order-actions/);
});

test("Employee Master resolves Legal Entity from current, legacy and location assignments", () => {
  assert.match(html, /function employeeMasterEntityLabel\(detail = \{\}, row = \[\]\)/);
  assert.match(html, /detail\.parent_entity_id[\s\S]*detail\.entity_id[\s\S]*location\?\.parentCode[\s\S]*location\?\.record\?\.parent_entity_id/);
  assert.match(html, /registeredEntityRecordsForOperations\(\)\.find/);
  assert.match(html, /legal_entity: employeeMasterEntityLabel\(detail, row\)/);
});

test("Employee Master renders actual profile completion as a compact progress bar", () => {
  assert.match(html, /function employeeMasterProfileCompletion\(row = \[\]\)/);
  assert.match(html, /employeeLinkedFormRecord\(employeeId, detail\)/);
  assert.match(html, /employeeReadiness\(record\)\.percent/);
  assert.match(html, /function employeeMasterProfileCompletionTone\(percent = 0\)[\s\S]*percent > 90[\s\S]*percent >= 50/);
  assert.match(html, /column\.key === "profile_completion"/);
  assert.match(html, /class="employee-profile-progress is-\$\{tone\}"/);
  assert.match(html, /class="badge \$\{tone\}">\$\{percent\}%/);
  assert.match(html, /role="progressbar"/);
});
