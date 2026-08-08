const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const optimizer = require("../roster-optimizer.cjs");

const shifts = [
  { id: "OPEN", name: "Opening Shift", timing: "05:30 AM - 02:30 PM", requiredStaff: 2, keyholderRequired: false },
  { id: "MID", name: "Mid-Day Shift", timing: "02:00 PM - 11:00 PM", requiredStaff: 1, keyholderRequired: false },
  { id: "CLOSE", name: "Closing Shift", timing: "06:30 PM - 02:30 AM", requiredStaff: 2, keyholderRequired: false }
];

const employee = (number, extras = {}) => ({
  id: `E${number}`,
  name: `Employee ${number}`,
  keyholderEligible: false,
  shiftCounts: {},
  ...extras
});

const shiftCounts = plan => Object.fromEntries(shifts.map(shift => [
  shift.id,
  plan.allocations.filter(item => item.shift.id === shift.id).length
]));

test("optimizer fills every sanctioned position as one coverage matrix", () => {
  const plan = optimizer.solveDay({
    employees: [1, 2, 3, 4, 5].map(employee),
    shifts,
    seed: "coverage"
  });
  assert.equal(plan.openSlots.length, 0);
  assert.equal(plan.allocations.length, 5);
  assert.deepEqual(shiftCounts(plan), { OPEN: 2, MID: 1, CLOSE: 2 });
  assert.equal(new Set(plan.allocations.map(item => item.employee.id)).size, 5);
});

test("surplus employees are assigned without creating stale open slots", () => {
  const plan = optimizer.solveDay({
    employees: [1, 2, 3, 4, 5, 6].map(employee),
    shifts,
    seed: "surplus"
  });
  const counts = shiftCounts(plan);
  assert.equal(plan.openSlots.length, 0);
  assert.equal(plan.allocations.length, 6);
  assert.ok(counts.OPEN >= 2);
  assert.ok(counts.MID >= 1);
  assert.ok(counts.CLOSE >= 2);
});

test("Not Required never manufactures a keyholder position", () => {
  const plan = optimizer.solveDay({
    employees: [1, 2].map(employee),
    shifts: [{ id: "CLOSE", name: "Closing Shift", timing: "06:30 PM - 02:30 AM", requiredStaff: 2, keyholderRequired: false }],
    seed: "no-keyholder"
  });
  assert.equal(plan.openSlots.length, 0);
  assert.equal(plan.allocations.length, 2);
  assert.equal(plan.allocations.some(item => item.requiresKeyholder), false);
});

test("required keyholder position is reserved for an eligible employee", () => {
  const plan = optimizer.solveDay({
    employees: [employee(1), employee(2, { keyholderEligible: true })],
    shifts: [{ id: "OPEN", name: "Opening Shift", timing: "05:30 AM - 02:30 PM", requiredStaff: 2, keyholderRequired: true }],
    seed: "keyholder"
  });
  const reserved = plan.allocations.find(item => item.requiresKeyholder);
  assert.equal(reserved.employee.id, "E2");
  assert.equal(plan.openSlots.length, 0);
});

test("configured primary keyholder is selected before the backup and other eligible employees", () => {
  const plan = optimizer.solveDay({
    employees: [
      employee(1, { keyholderEligible: true }),
      employee(2, { keyholderEligible: true }),
      employee(3, { keyholderEligible: true })
    ],
    shifts: [{
      id: "EVENING",
      name: "Evening Shift",
      timing: "01:30 PM - 10:00 PM",
      requiredStaff: 1,
      keyholderRequired: true,
      primaryKeyholderId: "E2",
      backupKeyholderId: "E1"
    }],
    seed: "primary-keyholder"
  });
  assert.equal(plan.allocations.find(item => item.requiresKeyholder).employee.id, "E2");
});

test("configured backup covers the shift when the primary keyholder is unavailable", () => {
  const plan = optimizer.solveDay({
    employees: [
      employee(1, { keyholderEligible: true, shiftPreferenceMode: "fixed", defaultShiftId: "MORNING" }),
      employee(3, { keyholderEligible: true, shiftPreferenceMode: "fixed", defaultShiftId: "MORNING" })
    ],
    shifts: [{
      id: "EVENING",
      name: "Evening Shift",
      timing: "01:30 PM - 10:00 PM",
      requiredStaff: 1,
      keyholderRequired: true,
      primaryKeyholderId: "E2",
      backupKeyholderId: "E1"
    }],
    respectPreferences: true,
    seed: "backup-keyholder"
  });
  assert.equal(plan.allocations.find(item => item.requiresKeyholder).employee.id, "E1");
});

test("other eligible keyholder is used only when primary and backup are unavailable", () => {
  const plan = optimizer.solveDay({
    employees: [employee(3, { keyholderEligible: true })],
    shifts: [{
      id: "EVENING",
      name: "Evening Shift",
      timing: "01:30 PM - 10:00 PM",
      requiredStaff: 1,
      keyholderRequired: true,
      primaryKeyholderId: "E2",
      backupKeyholderId: "E1"
    }],
    seed: "eligible-keyholder-fallback"
  });
  assert.equal(plan.openSlots.length, 0);
  assert.equal(plan.allocations.find(item => item.requiresKeyholder).employee.id, "E3");
});

test("backup covers Evening while Morning falls back to its configured backup", () => {
  const plan = optimizer.solveDay({
    employees: [
      employee(1, { keyholderEligible: true, shiftPreferenceMode: "fixed", defaultShiftId: "MORNING" }),
      employee(3, { keyholderEligible: true, shiftPreferenceMode: "fixed", defaultShiftId: "MORNING" }),
      employee(4)
    ],
    shifts: [
      {
        id: "MORNING",
        name: "Morning Shift",
        timing: "09:30 AM - 06:30 PM",
        requiredStaff: 1,
        keyholderRequired: true,
        primaryKeyholderId: "E1",
        backupKeyholderId: "E3"
      },
      {
        id: "EVENING",
        name: "Evening Shift",
        timing: "01:30 PM - 10:00 PM",
        requiredStaff: 1,
        keyholderRequired: true,
        primaryKeyholderId: "E2",
        backupKeyholderId: "E1"
      }
    ],
    respectPreferences: true,
    seed: "lower-parel-keyholder-hierarchy"
  });
  const keyholderByShift = Object.fromEntries(
    plan.allocations
      .filter(item => item.requiresKeyholder)
      .map(item => [item.shift.id, item.employee.id])
  );
  assert.deepEqual(keyholderByShift, { MORNING: "E3", EVENING: "E1" });
});

test("optimizer avoids unsafe closing-to-opening turnaround when coverage permits", () => {
  const plan = optimizer.solveDay({
    employees: [
      employee(1, { previousAssignment: { shiftId: "CLOSE", timing: "06:30 PM - 02:30 AM", dayGap: 1 } }),
      employee(2, { previousAssignment: { shiftId: "OPEN", timing: "05:30 AM - 02:30 PM", dayGap: 1 } })
    ],
    shifts: [
      { id: "OPEN", name: "Opening Shift", timing: "05:30 AM - 02:30 PM", requiredStaff: 1, keyholderRequired: false },
      { id: "CLOSE", name: "Closing Shift", timing: "06:30 PM - 02:30 AM", requiredStaff: 1, keyholderRequired: false }
    ],
    minimumRestMinutes: 480,
    seed: "rest"
  });
  assert.equal(plan.allocations.find(item => item.employee.id === "E1").shift.id, "CLOSE");
  assert.equal(plan.allocations.find(item => item.employee.id === "E2").shift.id, "OPEN");
  assert.equal(plan.warnings.length, 0);
});

test("a seven-day roster with one staggered weekly off per day has no gaps", () => {
  const allEmployees = [1, 2, 3, 4, 5, 6].map(employee);
  const priorByEmployee = new Map();
  let warningCount = 0;
  for (let day = 0; day < 7; day += 1) {
    const offEmployeeId = `E${(day % 6) + 1}`;
    const available = allEmployees
      .filter(item => item.id !== offEmployeeId)
      .map(item => {
        const previous = priorByEmployee.get(item.id);
        return {
          ...item,
          previousAssignment: previous ? { ...previous, dayGap: day - previous.day } : null
        };
      });
    const plan = optimizer.solveDay({ employees: available, shifts, seed: `week-${day}` });
    assert.equal(plan.openSlots.length, 0, `day ${day + 1} should be fully covered`);
    assert.deepEqual(shiftCounts(plan), { OPEN: 2, MID: 1, CLOSE: 2 });
    warningCount += plan.warnings.length;
    plan.allocations.forEach(item => priorByEmployee.set(item.employee.id, {
      shiftId: item.shift.id,
      timing: item.shift.timing,
      day
    }));
  }
  assert.equal(warningCount, 0, "staggered weekly offs should preserve minimum rest");
});

test("HRMS generation and recalculation both use the optimizer", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
  const server = fs.readFileSync(path.join(__dirname, "..", "server.mjs"), "utf8");
  assert.match(html, /src="roster-optimizer\.cjs"/);
  assert.match(html, /HrmsRosterOptimizer\.solveDay/);
  assert.match(html, /primaryKeyholderId: policy\?\.primary_keyholder_id/);
  assert.match(html, /backupKeyholderId: policy\?\.backup_keyholder_id/);
  assert.match(html, /Minimum Rest/);
  assert.match(html, /keyholderCoverageMissing = conflicts\.some/);
  assert.match(server, /url\.pathname === "\/roster-optimizer\.cjs"/);
});
