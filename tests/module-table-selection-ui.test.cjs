const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("generic module tables support selecting every visible record", () => {
  assert.match(html, /data-module-select-all aria-label="Select all visible records"/);
  assert.match(html, /data-module-row-select="\$\{config\.rows\.indexOf\(row\)\}"/);
  assert.match(html, /function setModuleVisibleRowSelection/);
  assert.match(html, /setModuleVisibleRowSelection\(selectAll\.checked\)/);
});

test("row selection keeps the header checkbox checked or indeterminate", () => {
  assert.match(html, /function syncModuleSelectAllState/);
  assert.match(html, /selectAll\.checked = rowSelections\.length > 0 && selectedCount === rowSelections\.length/);
  assert.match(html, /selectAll\.indeterminate = selectedCount > 0 && selectedCount < rowSelections\.length/);
  assert.match(html, /rowSelection\.closest\("tr"\)\?\.classList\.toggle\("is-selected", rowSelection\.checked\)/);
});

test("supported modules expose icon-only reset and bulk delete actions", () => {
  assert.match(html, /id="moduleReset"[^>]+aria-label="Reset filters"[^>]*><i data-lucide="rotate-ccw"><\/i><\/button>/);
  assert.match(html, /id="moduleBulkDelete"[^>]+aria-label="Delete selected records"[^>]+hidden><i data-lucide="trash-2"><\/i><\/button>/);
  assert.match(html, /const supportsBulkDelete = \["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\)/);
  assert.match(html, /bulkDelete\.hidden = !supportsBulkDelete \|\| selectedCount === 0/);
  assert.match(html, /async function deleteSelectedModuleRows/);
  assert.match(html, /requestHrmsDeletion\(\{ recordLabel, dependencies:/);
  assert.match(html, /moduleRowSourceRecords\[activePage\]\?\.splice\(index, 1\)/);
});

test("Attendance Register exposes reset and bulk-delete icons and deletes only saved attendance evidence", () => {
  assert.match(html, /id="attendanceResetButton"[^>]+aria-label="Reset attendance filters"[^>]*><i data-lucide="rotate-ccw"><\/i><\/button>/);
  assert.match(html, /id="moduleBulkDelete"[^>]+aria-label="Delete selected attendance entries"[^>]+hidden><i data-lucide="trash-2"><\/i><\/button>/);
  assert.match(html, /\$\("#moduleBulkDelete"\)\.addEventListener\("click", deleteSelectedModuleRows\)/);
  assert.match(html, /activePage === "attendance-list"[\s\S]*hrmsDeleteDependencies\("attendance", recordId, identity\.source\)/);
  assert.match(html, /restoreAttendanceProjection\(identity\.employeeId, identity\.workDate\)/);
  assert.match(html, /Scheduled employee rows remain in the register/);
});
