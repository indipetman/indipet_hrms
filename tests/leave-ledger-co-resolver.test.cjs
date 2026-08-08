const assert = require("node:assert/strict");
const test = require("node:test");

const resolver = require("../leave-ledger-co-resolver.cjs");

const candidate = {
  employee_id: "EMP-1",
  employee_name: "Test Employee",
  organization_id: "ENT-1",
  location_id: "LOC-1",
  location: "Test Location",
  date: "2026-08-15",
  holiday_id: "HOL-15-AUG",
  holiday_name: "Independence Day",
  roster_id: "RST-V1"
};

test("weekly-off holiday reconciliation credits one immediately available CO day", () => {
  const result = resolver.reconcileEntries([], [candidate], { now: "2026-08-05T00:00:00.000Z" });
  assert.equal(result.changed, true);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].leave_code, "CO");
  assert.equal(result.entries[0].available_days, 1);
  assert.equal(result.entries[0].pending_days, 0);
  assert.equal(result.entries[0].status, "Credited");
  assert.equal(result.entries[0].source_type, "WEEKLY_OFF_HOLIDAY");
  assert.equal(result.entries[0].transaction_date, "2026-08-15");
});

test("the credit is idempotent and a roster revision cannot duplicate it", () => {
  const first = resolver.reconcileEntries([], [candidate], { now: "2026-08-05T00:00:00.000Z" });
  const revised = resolver.reconcileEntries(first.entries, [{ ...candidate, roster_id: "RST-V2" }], { now: "2026-08-06T00:00:00.000Z" });
  assert.equal(revised.entries.length, 1);
  assert.equal(revised.entries[0].available_days, 1);
  assert.equal(revised.entries[0].source_id, "RST-V2");
  assert.equal(revised.entries[0].history.length, 1);
});

test("approved qualifying work on a CO-eligible holiday earns one available CO day", () => {
  const holidayWork = {
    ...candidate,
    source_type: "HOLIDAY_WORK",
    attendance_id: "ATT-15-AUG-EMP-1",
    worked_minutes: 538,
    attendance_status: "Present",
    attendance_issue: "None",
    timing_incidents: []
  };
  const result = resolver.reconcileEntries([], [holidayWork], { now: "2026-08-16T00:00:00.000Z" });
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].available_days, 1);
  assert.equal(result.entries[0].pending_days, 0);
  assert.equal(result.entries[0].source_type, "HOLIDAY_WORK");
  assert.equal(result.entries[0].source_id, "ATT-15-AUG-EMP-1");
  assert.match(result.entries[0].history[0].detail, /538 worked minutes/);
});

test("holiday work below four hours does not earn CO", () => {
  const result = resolver.reconcileEntries([], [{
    ...candidate,
    source_type: "HOLIDAY_WORK",
    attendance_id: "ATT-SHORT",
    worked_minutes: resolver.HOLIDAY_WORK_MINIMUM_MINUTES - 1,
    attendance_status: "Present",
    attendance_issue: "None",
    timing_incidents: []
  }]);
  assert.equal(result.entries.length, 0);
});

test("half-day, late, early-exit and incident attendance cannot earn holiday CO", () => {
  const properAttendance = {
    ...candidate,
    source_type: "HOLIDAY_WORK",
    attendance_id: "ATT-VALID",
    worked_minutes: 538,
    attendance_status: "Present",
    attendance_issue: "None",
    timing_incidents: []
  };
  const invalidCandidates = [
    { ...properAttendance, attendance_status: "Half Day" },
    { ...properAttendance, attendance_status: "Late" },
    { ...properAttendance, attendance_status: "Early Exit" },
    { ...properAttendance, attendance_issue: "Late Arrival" },
    { ...properAttendance, attendance_issue: "Early Exit" },
    { ...properAttendance, timing_incidents: ["LATE_ARRIVAL"] }
  ];
  invalidCandidates.forEach(invalid => {
    assert.equal(resolver.reconcileEntries([], [invalid]).entries.length, 0);
  });
  assert.equal(resolver.reconcileEntries([], [properAttendance]).entries.length, 1);
});

test("weekly-off overlap and approved holiday work cannot double-credit the same day", () => {
  const result = resolver.reconcileEntries([], [
    {
      ...candidate,
      source_type: "HOLIDAY_WORK",
      attendance_id: "ATT-1",
      worked_minutes: 538,
      attendance_status: "Present",
      attendance_issue: "None",
      timing_incidents: []
    },
    candidate
  ]);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].available_days, 1);
});

test("approved proper weekly-off work earns one immediately available Comp Off day", () => {
  const weeklyOffWork = {
    employee_id: "EMP-1",
    employee_name: "Test Employee",
    organization_id: "ENT-1",
    location_id: "LOC-1",
    location: "Test Location",
    date: "2026-08-09",
    roster_id: "RST-V1",
    attendance_id: "ATT-EMP-1-09",
    source_type: "WEEKLY_OFF_WORK",
    worked_minutes: 480,
    full_day_requirement_minutes: 480,
    attendance_status: "Present",
    attendance_issue: "None",
    timing_incidents: []
  };
  const result = resolver.reconcileEntries([], [weeklyOffWork], { now: "2026-08-09T18:45:00.000Z" });
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0].source_type, "WEEKLY_OFF_WORK");
  assert.equal(result.entries[0].source_id, "ATT-EMP-1-09");
  assert.equal(result.entries[0].available_days, 1);
  assert.match(result.entries[0].history[0].detail, /Approved full attendance/);
});

test("weekly-off work with a late, early, half-day or incomplete result earns no Comp Off", () => {
  const valid = {
    employee_id: "EMP-1",
    date: "2026-08-09",
    roster_id: "RST-V1",
    attendance_id: "ATT-EMP-1-09",
    source_type: "WEEKLY_OFF_WORK",
    worked_minutes: 480,
    full_day_requirement_minutes: 480,
    attendance_status: "Present",
    attendance_issue: "None",
    timing_incidents: []
  };
  [
    { attendance_status: "Half Day" },
    { attendance_issue: "Late Arrival" },
    { timing_incidents: ["Early Exit"] },
    { worked_minutes: 479 }
  ].forEach(change => assert.equal(resolver.reconcileEntries([], [{ ...valid, ...change }]).entries.length, 0));
});

test("withdrawn schedule matches and invalid legacy holiday-work placeholders are removed", () => {
  const generated = resolver.reconcileEntries([], [candidate]).entries[0];
  const legacy = {
    ledger_id: "leave-ledger-migrated-co-ledger-1",
    leave_code: "CO",
    available_days: 0,
    pending_days: 1,
    history: [{ action: "Migrated from CO Ledger", detail: "Holiday Work | 1 Day" }]
  };
  const preserved = { ledger_id: "manual-adjustment-1", leave_code: "CO", available_days: 2, pending_days: 0 };
  const result = resolver.reconcileEntries([generated, legacy, preserved], []);
  assert.deepEqual(result.entries, [preserved]);
  assert.equal(result.changed, true);
});
