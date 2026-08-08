const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

function extractRequiredRule() {
  const match = html.match(/function rosterRuleIsRequired\(value\)\s*\{[\s\S]*?\n\s*\}/);
  assert.ok(match, "rosterRuleIsRequired must exist");
  return Function(`${match[0]}; return rosterRuleIsRequired;`)();
}

test("Shift Policy owns a dedicated Excel-backed HRMS table", () => {
  assert.match(server, /shift_policies:\s*\{/);
  assert.match(server, /key:\s*"policy_id"/);
  assert.match(server, /"keyholder_required"/);
  assert.match(server, /needsShiftPolicyMigration/);
  assert.match(server, /pre-shift-policies/);
});

test("Shift Policy snapshot is flattened separately from ERP-owned locations", () => {
  assert.match(html, /shift_policies:\s*subLocations\.flatMap/);
  assert.match(html, /persistedShiftPoliciesByLocation/);
  assert.match(html, /data\.shift_policies/);
  assert.match(html, /shiftPolicyRecords:\s*persistedShiftPoliciesByLocation\.get/);
});

test("Not Required remains false after Excel boolean hydration", () => {
  const isRequired = extractRequiredRule();
  for (const value of [false, "FALSE", "false", "No", "Not Required", "", 0]) {
    assert.equal(isRequired(value), false, `${JSON.stringify(value)} must not require a keyholder`);
  }
  for (const value of [true, "TRUE", "Yes", "Required"]) {
    assert.equal(isRequired(value), true, `${JSON.stringify(value)} must require a keyholder`);
  }
  assert.match(html, /shiftPolicyKeyholderRequired = rosterRuleIsRequired\(record\.keyholder_required\)/);
  assert.doesNotMatch(html, /shiftPolicyKeyholderRequired = Boolean\(record\.keyholder_required\)/);
});

test("Roster flags keyholder coverage only for policies that require it", () => {
  assert.match(html, /const keyholderRequired = rosterRuleIsRequired\(policy\?\.keyholder_required\)/);
  assert.match(html, /else if \(keyholderRequired && !hasKeyholder\)/);
  assert.match(html, /if \(rosterRuleIsRequired\(policy\?\.keyholder_required\) && !shiftAssignments\.some/);
  assert.match(html, /function reconcileRosterPolicyDerivedState/);
  assert.match(html, /recalculatedRosterPolicyCount/);
});

test("Shift Policy success waits for Excel acknowledgement and rolls back on failure", () => {
  const saveStart = html.indexOf("async function saveShiftPolicyRecord");
  const saveEnd = html.indexOf("async function createShiftPolicy", saveStart);
  const saveFunction = html.slice(saveStart, saveEnd);
  assert.match(saveFunction, /await persistHrmsReserve\(\) !== "excel"/);
  assert.match(saveFunction, /location\.shifts = previousShifts/);
  assert.match(saveFunction, /location\.shiftPolicyRecords = previousPolicyRecords/);
  assert.match(saveFunction, /not saved to the Excel database/);
});

test("Keyholder choices are rebuilt from persisted employees and designation eligibility", () => {
  assert.match(html, /function getKeyholderOptions/);
  assert.match(html, /rosterEmployeePool\(location\)/);
  assert.match(html, /employee\.keyholderEligible/);
  assert.match(html, /designationRecordByCodeOrName/);
});

test("new Shift Policy forms are Active and leave staffing values blank", () => {
  assert.match(html, /\$\("#shiftPolicyStatus"\)\.value = "Active"/);
  assert.match(html, /\$\("#shiftRequiredStaff"\)\.value = ""/);
  assert.match(html, /\$\("#shiftDailyLeaveLimit"\)\.value = ""/);
  assert.match(html, /String\(record\.sanctioned_strength \?\? ""\)/);
  assert.match(html, /String\(record\.max_leave_per_day \?\? ""\)/);
});
