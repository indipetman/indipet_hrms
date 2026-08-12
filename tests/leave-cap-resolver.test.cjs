const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const resolver = require("../leave-cap-resolver.cjs");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

function snapshot(requests = [], cap = 1) {
  return {
    employees: [
      { employee_id: "E1", record: { location_id: "L1", default_shift_id: "S1" } },
      { employee_id: "E2", record: { location_id: "L1", default_shift_id: "S1" } },
      { employee_id: "E3", record: { location_id: "L1", default_shift_id: "S1" } }
    ],
    shift_policies: [{ policy_id: "S1", location_id: "L1", policy_status: "Active", max_leave_per_day: cap }],
    rosters: [],
    module_rows: requests.map((request, index) => ({
      row_id: `R${index + 1}`,
      pageKey: "leave-requests",
      status: "Approved",
      cells: [`R${index + 1}`, request.employee_name || request.employee_id, "Casual Leave", "06/08/2026", "Approved"],
      details: {
        request_id: `R${index + 1}`,
        employee_id: request.employee_id,
        employee_name: request.employee_name || request.employee_id,
        start_date: "2026-08-06",
        end_date: "2026-08-06",
        leave_portion: request.portion || "FULL_DAY",
        decision_status: "Approved"
      }
    }))
  };
}

test("approved full-day leave cannot exceed the Excel-backed shift/day cap", () => {
  const result = resolver.validateApprovedLeaveCaps(snapshot([
    { employee_id: "E1" },
    { employee_id: "E2" }
  ], 1));
  assert.equal(result.ok, false);
  assert.equal(result.blockers[0].cap, 1);
  assert.equal(result.blockers[0].approved_count, 2);
});

test("opposite half-day requests do not consume the same concurrent slot", () => {
  const result = resolver.validateApprovedLeaveCaps(snapshot([
    { employee_id: "E1", portion: "FIRST_HALF" },
    { employee_id: "E2", portion: "SECOND_HALF" }
  ], 1));
  assert.equal(result.ok, true);
});

test("overlapping half-day requests are blocked", () => {
  const result = resolver.validateApprovedLeaveCaps(snapshot([
    { employee_id: "E1", portion: "FIRST_HALF" },
    { employee_id: "E2", portion: "FIRST_HALF" }
  ], 1));
  assert.equal(result.ok, false);
  assert.equal(result.blockers[0].approved_count, 2);
});

test("published roster assignment resolves the applicable shift before employee default", () => {
  const data = snapshot([{ employee_id: "E1" }], 1);
  data.shift_policies.push({ policy_id: "S2", location_id: "L1", policy_status: "Active", max_leave_per_day: 2 });
  data.rosters.push({
    roster_id: "RO1",
    location_id: "L1",
    start_date: "2026-08-01",
    end_date: "2026-08-31",
    status: "Published",
    version: 1,
    assignments: [{ employee_id: "E1", date: "2026-08-06", shift_id: "S2", status: "Assigned" }]
  });
  const event = resolver.approvedEvents(data)[0];
  assert.equal(event.shift_id, "S2");
  assert.equal(event.policy_id, "S2");
});

test("approval is allowed before roster generation when no default shift can resolve", () => {
  const data = snapshot([{ employee_id: "E1" }], 1);
  data.employees[0].record.default_shift_id = "";
  const result = resolver.validateApprovedLeaveCaps(data);
  assert.equal(result.ok, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].status, "Deferred Until Roster");
  assert.match(result.deferred[0].detail, /deferred until roster planning/i);
});

test("approval remains blocked when a resolved shift has no active leave-cap policy", () => {
  const data = snapshot([{ employee_id: "E1" }], 1);
  data.shift_policies = [];
  const result = resolver.validateApprovedLeaveCaps(data);
  assert.equal(result.ok, false);
  assert.equal(result.blockers[0].status, "Blocked");
  assert.match(result.blockers[0].detail, /No active Excel-backed shift policy/);
});

test("HRMS UI and server share the same leave-cap resolver", () => {
  assert.match(html, /<script src="leave-cap-resolver\.cjs"><\/script>/);
  assert.match(html, /Maximum Employees on Leave per Shift\/Day/);
  assert.match(html, /HrmsLeaveCapResolver\.evaluateApproval/);
  assert.match(html, /leaveCapConflictsForRoster/);
  assert.match(html, /Revision Required/);
  assert.match(server, /import HrmsLeaveCapResolver from "\.\/leave-cap-resolver\.cjs"/);
  assert.match(server, /validateApprovedLeaveCaps/);
  assert.match(server, /leave-cap-resolver\.cjs/);
});
