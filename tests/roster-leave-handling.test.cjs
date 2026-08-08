const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

function functionSource(name) {
  const start = html.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const signatureEnd = html.indexOf(")", start);
  const bodyStart = html.indexOf("{", signatureEnd);
  assert.notEqual(bodyStart, -1, `${name} should have a body`);
  let depth = 0;
  for (let index = bodyStart; index < html.length; index += 1) {
    if (html[index] === "{") {
      depth += 1;
    } else if (html[index] === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(start, index + 1);
    }
  }
  throw new Error(`Could not extract ${name}`);
}

test("Roster Leave Handling offers Approved only or Ignore", () => {
  assert.match(html, /name="rosterLeaveHandling" value="approved" checked>[\s\S]*?Approved leave only/);
  assert.match(html, /name="rosterLeaveHandling" value="ignore">[\s\S]*?Ignore/);
  assert.doesNotMatch(html, /Approved \+ pending leave/);
  assert.doesNotMatch(html, /name="rosterLeaveHandling" value="approved_pending"/);
});

test("Ignore bypasses leave exclusion during generation and recalculation", () => {
  const leaveLookup = functionSource("rosterApprovedLeaveFor");
  const generation = functionSource("generateRosterPreview");
  const recalculation = functionSource("recalculateRosterMetrics");
  const reconciliation = functionSource("replaceEditableRosterLeaveAssignments");

  assert.match(leaveLookup, /leaveHandling === "ignore"\) return false/);
  assert.match(generation, /leave_handling: setup\.leaveHandling === "ignore" \? "ignore" : "approved"/);
  assert.match(recalculation, /leaveHandling: record\.leave_handling \|\| "approved"/);
  assert.match(reconciliation, /record\.leave_handling === "ignore"[\s\S]*?record\.leave_days = \[\][\s\S]*?return 0/);
});

test("approved leave dates are materialized with their leave type", () => {
  const rows = [["LR-1", "Vikram Mehra", "Casual Leave", "10/08/2026 - 12/08/2026", "Approved"]];
  const context = {
    pageConfig: { "leave-requests": { rows } },
    moduleRowSourceRecords: {
      "leave-requests": [{
        row_id: "LR-1",
        details: {
          request_id: "LR-1",
          employee_id: "EMP-1",
          employee_name: "Vikram Mehra",
          leave_code: "CL",
          leave_name: "Casual Leave",
          start_date: "2026-08-10",
          end_date: "2026-08-12",
          decision_status: "Approved"
        }
      }]
    },
    hrmsScopedModuleRows: () => rows,
    normalizeDepartmentLink: value => String(value || "").trim().toLowerCase(),
    rosterLeaveDateMatches: () => false,
    HrmsLeaveCapResolver: {
      expandDates: (start, end) => ["2026-08-10", "2026-08-11", "2026-08-12"].filter(date => date >= start && date <= end)
    }
  };
  vm.createContext(context);
  vm.runInContext([
    functionSource("rosterApprovedLeaveFor"),
    functionSource("employeeOnRosterLeave"),
    functionSource("buildRosterApprovedLeaveDays")
  ].join("\n"), context);

  const employee = { id: "EMP-1", name: "Vikram Mehra" };
  const dates = ["2026-08-10", "2026-08-11", "2026-08-12"].map(iso => ({ iso }));
  const leaveDays = context.buildRosterApprovedLeaveDays({ id: "LOC-1" }, [employee], dates, { leaveHandling: "approved" });
  assert.deepEqual(JSON.parse(JSON.stringify(leaveDays)), dates.map(date => ({
    employee_id: "EMP-1",
    employee_name: "Vikram Mehra",
    date: date.iso,
    reason: "Casual Leave",
    leave_request_id: "LR-1",
    leave_code: "CL",
    source: "approved_leave"
  })));
  assert.equal(context.buildRosterApprovedLeaveDays({ id: "LOC-1" }, [employee], dates, { leaveHandling: "ignore" }).length, 0);
});

test("approved leave outranks weekly off and Not Scheduled in editable rosters", () => {
  assert.match(functionSource("generateRosterPreview"), /if \(employeeOnRosterLeave\(employee, date, setup\)\) return;[\s\S]*?const leaveDays = buildRosterApprovedLeaveDays/);
  assert.match(functionSource("recalculateRosterMetrics"), /replaceEditableRosterLeaveAssignments\(record\);[\s\S]*?assignments = record\.assignments \|\| \[\]/);
  assert.match(functionSource("applyRosterCellUpdate"), /record\.leave_handling !== "ignore" && approvedLeave && action !== "leave"/);
  assert.match(functionSource("applyRosterCellUpdate"), /No approved leave request exists/);
  assert.match(functionSource("reconcileRosterPolicyDerivedState"), /leave_days: record\.leave_days \|\| \[\]/);
});

test("approved leave is resolved dynamically and displayed before a preserved published shift", () => {
  const leaveLookup = functionSource("rosterManualLeaveFor");
  const renderCell = functionSource("renderRosterCell");
  const exportDataset = functionSource("rosterBoardExportDataset");

  assert.match(leaveLookup, /record\.leave_handling === "ignore"/);
  assert.match(leaveLookup, /rosterApprovedLeaveFor/);
  assert.ok(
    renderCell.indexOf("const approvedLeavePreview") < renderCell.indexOf("if (assignment)"),
    "the board must render approved leave before the preserved shift"
  );
  assert.ok(
    exportDataset.indexOf("} else if (leave) {") < exportDataset.indexOf("} else if (assignment) {"),
    "exports must use the same leave-before-shift precedence as the board"
  );
});

test("the chosen leave handling mode persists in the Excel roster sheet", () => {
  assert.match(functionSource("normalizeRosterRecord"), /leave_handling: record\.leave_handling === "ignore" \? "ignore" : "approved"/);
  assert.match(server, /"issue", "leave_handling", "assignments"/);
  assert.match(server, /pre-roster-leave-handling/);
});
