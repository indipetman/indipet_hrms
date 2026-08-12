const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");
const boundary = fs.readFileSync(path.join(root, "hrms-data-boundary.cjs"), "utf8");

test("Holiday Calendar has a dedicated operational page", () => {
  assert.match(html, /title: "Holiday Calendar"/);
  assert.match(html, /action: "Add Holiday"/);
  assert.match(html, /labels: \["Active Holidays", "Store Closures", "CO Eligible"\]/);
  assert.match(html, /columns: \["Date", "Holiday", "Type", "Scope", "Store Status", "Holiday Work CO", "Status"\]/);
  assert.match(html, /function syncHolidayCalendarPage/);
  assert.match(html, /function updateHolidayCalendarValues/);
  assert.match(html, /isLeavePolicy \|\| isLeaveLedger \|\| isHolidayCalendar/);
});

test("view-only Holiday Calendar access keeps a functional row action", () => {
  assert.match(html, /const canViewRow = currentPage === "holiday-calendar" && hrmsCanAccessPage\(actionPage, "View"\)/);
  assert.match(html, /data-module-floating-action="view"/);
  assert.match(html, /if \(actionName === "view"\) \{\s*activePage = actionPage;\s*openModal\(\{ mode: "view", rowIndex \}\);/s);
  assert.match(html, /\? isView \? "View Holiday" : isEdit \? "Edit Holiday" : "Add Holiday"/);
  assert.match(html, /recordSubmitButton"\)\.hidden = isView/);
});

test("Holiday form captures date, treatment and a searchable multi-scope", () => {
  assert.match(html, /function renderHolidayCalendarModalFields/);
  assert.match(html, /id="recordHolidayName"[^>]+required/);
  assert.match(html, /id="recordHolidayDate"[^>]+type="date"[^>]+required/);
  assert.match(html, /id="recordHolidayType"/);
  assert.match(html, /option value="FULL_COVERAGE">Full Coverage/);
  assert.match(html, /option value="ENTITY">Company \/ Entity/);
  assert.match(html, /option value="STATE">State/);
  assert.match(html, /option value="LOCATION">Location/);
  assert.match(html, /recordHolidayScopeSearch[^>]+role="combobox"/);
  assert.match(html, /recordHolidayScopeResults" role="listbox" aria-multiselectable="true"/);
  assert.match(html, /id="recordHolidayScopeSelections"/);
  assert.match(html, /function setHolidayCalendarScopeSelections/);
  assert.match(html, /holidayCalendarScopeSelections = \[\.\.\.holidayCalendarScopeSelections, option\]/);
  assert.match(html, /data-holiday-scope-remove/);
  assert.match(html, /function configureHolidayCalendarScopeCombobox/);
  assert.match(html, /id="recordHolidayStoreClosed"/);
  assert.match(html, /id="recordHolidayCoEligible"/);
  assert.match(html, /function validateHolidayCalendarForm/);
  assert.doesNotMatch(html, /label: `\$\{state\.state_name \|\| state\.state_code\}\$\{state\.gst_state_code/);
});

test("Holiday rows resolve date, labels, scope and operational flags", () => {
  assert.match(html, /systemDateToDisplay\(holiday\.holiday_date/);
  assert.match(html, /holidayCalendarTypeLabel\(holiday\.holiday_type\)/);
  assert.match(html, /holiday\.store_closed === true \? "Closed" : "Open"/);
  assert.match(html, /holiday\.co_eligible === true \? "Eligible" : "Not Eligible"/);
  assert.match(html, /function holidayCalendarRowMatchesLocation/);
  assert.match(html, /scopeType === "FULL_COVERAGE"/);
  assert.match(html, /scopeType === "ENTITY"/);
  assert.match(html, /scopeType === "STATE"/);
  assert.match(html, /scopeType === "LOCATION"/);
  assert.match(html, /function holidayCalendarScopeKeys/);
  assert.match(html, /holidayCalendarScopeKeys\(holiday\)\.some/);
  assert.match(html, /holidayCalendarScopeSummary\(holiday\)/);
});

test("Holiday Calendar persists and supports edit, row delete and bulk delete", () => {
  assert.match(server, /holiday_calendar:\s*\{/);
  assert.match(server, /"store_closed", "co_eligible"/);
  assert.match(server, /"scope_keys", "scope_labels"/);
  assert.match(server, /pre-holiday-multi-scope/);
  assert.match(boundary, /"holiday_calendar"/);
  assert.match(html, /holiday_calendar: holidayCalendarRecords\.map\(holiday => \(\{/);
  assert.match(html, /scope_keys: holidayCalendarScopeKeys\(holiday\)/);
  assert.match(html, /if \(activePage === "holiday-calendar"\)/);
  assert.match(html, /holidayCalendarRecords\.push\(holidayRecord\)/);
  assert.match(html, /scope_keys: scopeKeys/);
  assert.match(html, /scope_labels: scopeLabels/);
  assert.match(html, /Holiday was not saved\. The Excel database did not acknowledge it/);
  assert.match(html, /if \(actionPage === "holiday-calendar"\)/);
  assert.match(html, /holidayCalendarRecords\.splice/);
  assert.match(html, /\["employee-master", "department-master", "designation-master", "leave-requests", "holiday-calendar", "attendance-list"\]\.includes\(activePage\)/);
  assert.match(html, /syncHolidayCalendarPage\(\);\s*reconcileRostersWithHolidayCalendar\(\);\s*reconcileLeaveLedgerEntries\(\);\s*syncLeaveLedgerPage\(\);\s*const persistenceTarget = await persistHrmsReserve/s);
});

test("Holiday duplicate checks reject overlapping selected scopes", () => {
  assert.match(html, /function holidayCalendarScopesOverlap/);
  assert.match(html, /if \(leftType === "FULL_COVERAGE" \|\| rightType === "FULL_COVERAGE"\) return true/);
  assert.match(html, /holidayCalendarScopesOverlap\(holiday, pendingScope\)/);
});

test("active closed holidays are resolved by date and organizational scope", () => {
  assert.match(html, /function holidayCalendarRecordMatchesLocation/);
  assert.match(html, /function holidayCalendarRecordForDate/);
  assert.match(html, /holiday\.status === "Active"/);
  assert.match(html, /holiday\.store_closed === true/);
  assert.match(html, /holidayCalendarRecordMatchesLocation\(holiday, location\)/);
  assert.match(html, /function closedHolidayForLocation/);
});

test("Holiday Calendar is linked to roster generation, validation, revisions and exports", () => {
  assert.match(html, /const holidayClosureDates = new Set/);
  assert.match(html, /locationIsOpenOnDate\(location, date\) && !holidayClosureDates\.has\(date\.iso\)/);
  assert.match(html, /type: "Closed Holiday Assignment"/);
  assert.match(html, /The published assignment is preserved for audit; create a revision to remove it/);
  assert.match(html, /<strong>Closed Holiday<\/strong>/);
  assert.match(html, /assignmentName = `Closed Holiday - \$\{holiday\.holiday_name/);
  assert.match(html, /recalculateRosterMetrics\(revision\)/);
  assert.match(html, /reconcileRostersWithHolidayCalendar\(\)/);
});

test("Holiday Calendar Export button offers filtered Excel and PDF downloads", () => {
  assert.match(html, /function filteredHolidayCalendarRowsForExport\(\)/);
  assert.match(html, /hrmsScopedModuleRows\("holiday-calendar"\)\.filter/);
  assert.match(html, /holidayCalendarRowMatchesLocation\(row, location\)/);
  assert.match(html, /function runHolidayCalendarExport\(format = "excel"\)/);
  assert.match(html, /exportRosterDatasetExcel\(dataset, holidayCalendarExportFileName\("xlsx"\), "Holiday Calendar"\)/);
  assert.match(html, /title: "Holiday Calendar"/);
  assert.match(html, /openExportFormatMenu\(\{ context: "holiday-calendar" \}\)/);
  assert.match(html, /exportContext === "holiday-calendar"\) runHolidayCalendarExport\(format\)/);
});

test("a published weekly off on an active declared holiday creates an automatic CO credit", () => {
  assert.match(html, /src="weekly-off-holiday-resolver\.cjs"/);
  assert.match(server, /url\.pathname === "\/weekly-off-holiday-resolver\.cjs"/);
  assert.match(html, /function weeklyOffHolidayCompOffCandidates/);
  assert.match(html, /WeeklyOffHolidayResolver\.resolveCandidates/);
  assert.match(html, /rosters: rosterRecords/);
  assert.match(html, /holidays: holidayCalendarRecords/);
  assert.match(html, /function reconcileWeeklyOffHolidayCompOffCredits/);
  assert.match(html, /LeaveLedgerCoResolver\.reconcileEntries/);
  assert.doesNotMatch(html, /holidayCalendarRecordForDate\(assignment\.date, location, \{ coEligibleOnly: true \}\)/);
  assert.match(server, /leave-ledger-co-resolver\.cjs/);
});

test("holiday changes and roster publication reconcile the linked CO ledger before Excel save", () => {
  assert.match(html, /syncHolidayCalendarPage\(\);\s*reconcileRostersWithHolidayCalendar\(\);\s*reconcileLeaveLedgerEntries\(\);\s*syncLeaveLedgerPage\(\);\s*const persistenceTarget = await persistHrmsReserve\(\);/s);
  assert.match(html, /const publishSnapshot = JSON\.parse\(JSON\.stringify\(hrmsReserveSnapshot\(\)\)\)/);
  assert.match(html, /record\.status = "Published";[\s\S]*?reconcileLeaveLedgerEntries\(\);\s*syncLeaveLedgerPage\(\);\s*const persistenceTarget = await persistHrmsReserve\(\);/);
  assert.match(html, /Roster was not published[\s\S]*?previous roster and CO ledger were restored/);
  assert.match(html, /A holiday on an organizational or employee weekly off always credits CO automatically/);
});

test("approved attendance on a CO-eligible holiday creates an automatic CO credit", () => {
  assert.match(html, /function approvedHolidayWorkCompOffCandidates/);
  assert.match(html, /function approvedWeeklyOffWorkCompOffCandidates/);
  assert.match(html, /\["APPROVED", "AUTO_APPROVED", "OVERRIDDEN"\]\.includes\(decisionStatus\)/);
  assert.match(html, /holidayCalendarRecordForDate\(date, location, \{ coEligibleOnly: true \}\)/);
  assert.match(html, /attendance_status: finalStatus/);
  assert.match(html, /attendance_issue: details\.calculated_issue \|\| details\.issue \|\| row\[8\] \|\| "None"/);
  assert.match(html, /timing_incidents: Array\.isArray\(details\.calculated_timing_incidents\)/);
  assert.match(html, /source_type: "HOLIDAY_WORK"/);
  assert.match(html, /\[\s*\.\.\.approvedHolidayWorkCompOffCandidates\(\),\s*\.\.\.approvedWeeklyOffWorkCompOffCandidates\(\),\s*\.\.\.weeklyOffHolidayCompOffCandidates\(\)\s*\]/);
  assert.match(html, /reconcileLeaveLedgerEntries\(\);\s*syncLeaveLedgerPage\(\);\s*(?:const persistenceTarget = )?await persistHrmsReserve\(\);/);
});
