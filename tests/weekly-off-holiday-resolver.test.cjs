const assert = require("node:assert/strict");
const test = require("node:test");

const resolver = require("../weekly-off-holiday-resolver.cjs");
const coResolver = require("../leave-ledger-co-resolver.cjs");

const location = {
  id: "LOC-1",
  name: "Kolkata HQ",
  listName: "Indipet Kolkata HQ",
  parentCode: "ENT-1",
  operatingHoursRecords: [
    ...[1, 2, 3, 4, 5, 6].map(dayOfWeek => ({ dayOfWeek, isOpen: true })),
    { dayOfWeek: 7, isOpen: false }
  ]
};

const employees = [
  { employee_id: "EMP-1", employee_name: "Ayan", organization_id: "ENT-1", location_id: "LOC-1", status: "Active" },
  { employee_id: "EMP-2", employee_name: "Arpita", organization_id: "ENT-1", location_id: "LOC-1", status: "Active" },
  { employee_id: "EMP-3", employee_name: "Inactive", organization_id: "ENT-1", location_id: "LOC-1", status: "Inactive" },
  { employee_id: "EMP-4", employee_name: "Other", organization_id: "ENT-1", location_id: "LOC-2", status: "Active" }
];

const roster = {
  roster_id: "RST-JUNE",
  location_id: "LOC-1",
  period: "01/06/2026 - 30/06/2026",
  status: "Published",
  weekly_offs: []
};

const holiday = {
  holiday_id: "HOL-21-JUNE",
  holiday_date: "2026-06-21",
  holiday_name: "Sunday Holiday",
  scope_type: "FULL_COVERAGE",
  scope_keys: ["FULL_COVERAGE"],
  status: "Active",
  store_closed: false,
  co_eligible: false
};

test("a holiday on the organization weekly closed day credits every active location employee", () => {
  for (const storeClosed of [false, true]) {
    for (const coEligible of [false, true]) {
      const candidates = resolver.resolveCandidates({
        rosters: [roster],
        locations: [location],
        employees,
        holidays: [{ ...holiday, store_closed: storeClosed, co_eligible: coEligible }]
      });
      assert.deepEqual(candidates.map(candidate => candidate.employee_id), ["EMP-1", "EMP-2"]);
      assert.ok(candidates.every(candidate => candidate.weekly_off_basis === "ORGANIZATION_CLOSED_DAY"));
    }
  }
});

test("an employee weekly off at an open organization also earns CO and is not duplicated", () => {
  const openLocation = {
    ...location,
    operatingHoursRecords: [1, 2, 3, 4, 5, 6, 7].map(dayOfWeek => ({ dayOfWeek, isOpen: true }))
  };
  const explicitRoster = {
    ...roster,
    weekly_offs: [{ employee_id: "EMP-1", employee_name: "Ayan", date: "2026-06-21" }]
  };
  const candidates = resolver.resolveCandidates({
    rosters: [explicitRoster],
    locations: [openLocation],
    employees,
    holidays: [holiday]
  });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].employee_id, "EMP-1");
  assert.equal(candidates[0].weekly_off_basis, "ROSTER_WEEKLY_OFF");

  const closedCandidates = resolver.resolveCandidates({
    rosters: [explicitRoster],
    locations: [location],
    employees,
    holidays: [holiday]
  });
  assert.equal(closedCandidates.filter(candidate => candidate.employee_id === "EMP-1").length, 1);
});

test("inactive holidays, unpublished rosters and unrelated scopes cannot create CO", () => {
  const inputs = { locations: [location], employees, holidays: [holiday], rosters: [roster] };
  assert.equal(resolver.resolveCandidates({ ...inputs, holidays: [{ ...holiday, status: "Inactive" }] }).length, 0);
  assert.equal(resolver.resolveCandidates({ ...inputs, rosters: [{ ...roster, status: "Draft" }] }).length, 0);
  assert.equal(resolver.resolveCandidates({
    ...inputs,
    holidays: [{ ...holiday, scope_type: "LOCATION", scope_key: "LOC-2", scope_keys: ["LOC-2"] }]
  }).length, 0);
});

test("weekly-off holiday candidates reconcile into one reloadable CO transaction per employee and date", () => {
  const candidates = resolver.resolveCandidates({ rosters: [roster], locations: [location], employees, holidays: [holiday] });
  const first = coResolver.reconcileEntries([], candidates, { now: "2026-06-21T00:00:00.000Z" });
  const second = coResolver.reconcileEntries(first.entries, candidates, { now: "2026-06-22T00:00:00.000Z" });
  assert.equal(first.entries.length, 2);
  assert.equal(second.entries.length, 2);
  assert.ok(second.entries.every(entry => entry.available_days === 1 && entry.source_type === "WEEKLY_OFF_HOLIDAY"));
  assert.match(second.entries[0].history[0].detail, /regardless of holiday Store Status or Holiday Work CO setting/);
});

test("attendance resolves an organization-closed Sunday before treating it as a roster mismatch", () => {
  const result = resolver.resolveWeeklyOffContext({
    roster,
    location,
    employee: employees[0],
    date: "2026-06-14",
    policies: [{
      policy_id: "SFP1401",
      policy_status: "Active",
      coverage_role: "Standard",
      weekly_off_pattern: "Fixed",
      weekly_off_day: 7
    }]
  });
  assert.deepEqual(result, {
    is_weekly_off: true,
    weekly_off_basis: "ORGANIZATION_CLOSED_DAY",
    roster_shift: "Weekly Off / Location Closed",
    attendance_shift: "Not applicable",
    requires_punch: false
  });
});

test("fixed Shift Policy weekly offs are normalized and ambiguous policies fail closed", () => {
  const openLocation = {
    ...location,
    operatingHoursRecords: [1, 2, 3, 4, 5, 6, 7].map(dayOfWeek => ({ dayOfWeek, isOpen: true }))
  };
  const sundayPolicy = {
    policy_id: "SFP-SUN",
    policy_status: "Active",
    coverage_role: "Standard",
    weekly_off_pattern: "Fixed",
    weekly_off_day: "7 - Sunday"
  };
  assert.equal(resolver.weeklyOffDayNumber("Sunday"), 7);
  assert.equal(resolver.weeklyOffDayNumber("7 - Sunday"), 7);
  assert.equal(resolver.resolveWeeklyOffContext({
    roster,
    location: openLocation,
    employee: { ...employees[0], default_shift_id: "SFP-SUN" },
    date: "2026-06-14",
    policies: [sundayPolicy]
  }).weekly_off_basis, "SHIFT_POLICY_FIXED_DAY");
  assert.equal(resolver.resolveWeeklyOffContext({
    roster,
    location: openLocation,
    employee: employees[0],
    date: "2026-06-14",
    policies: [sundayPolicy, { ...sundayPolicy, policy_id: "SFP-SAT", weekly_off_day: 6 }]
  }), null);
});
