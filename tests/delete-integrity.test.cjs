const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const DeleteIntegrity = require("../hrms-delete-integrity.cjs");
const ReferentialIntegrity = require("../hrms-referential-integrity.cjs");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

test("linked HRMS records block parent deletion with useful dependency labels", () => {
  const snapshot = {
    employees: [{ employee_id: "E1", record: {} }],
    employee_family_members: [{ family_member_id: "FM1", employee_id: "E1" }],
    employee_documents: [{ document_id: "DOC1", employee_id: "E1" }],
    employee_education: [{ education_id: "EDU1", employee_id: "E1" }],
    employee_experience: [{ experience_id: "EXP1", employee_id: "E1" }],
    employee_skills: [{ skill_id: "SK1", employee_id: "E1" }],
    employee_finance_benefits: [{ finance_benefit_id: "FIN1", employee_id: "E1" }],
    attendance: [{ id: "A1", employee_id: "E1" }],
    leave_ledger: [{ ledger_id: "L1", employee_id: "E1" }],
    rosters: [{ roster_id: "R1", assignments: [{ employee_id: "E1" }] }],
    module_rows: []
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "employee",
    recordId: "E1"
  }), [
    "1 family-member record",
    "1 employee document",
    "1 education record",
    "1 experience record",
    "1 skill record",
    "1 finance/statutory record",
    "1 attendance record",
    "1 leave-ledger entry",
    "1 roster"
  ]);
});

test("ERP-owned entities cannot be deleted while an HRMS operating context references them", () => {
  const snapshot = {
    operating_contexts: [{ context_id: "default", primary_entity_id: "ENT1", active_entity_id: "ENT1" }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "entity",
    recordId: "ENT1"
  }), ["1 operating context"]);
});

test("linked employee datasets fail closed when their employee is missing", () => {
  const result = ReferentialIntegrity.validateHrmsReferences({
    employees: [],
    employee_documents: [{ document_id: "DOC-ORPHAN", employee_id: "E-MISSING" }]
  });
  assert.equal(result.ok, false);
  assert.equal(result.table, "employee_documents");
  assert.equal(result.blockers[0].employee_id, "E-MISSING");
});

test("employee deletion is blocked by reporting-line and keyholder assignments", () => {
  const snapshot = {
    employees: [
      { employee_id: "E-MANAGER", record: {} },
      { employee_id: "E-REPORT", record: { reporting_manager_id: "E-MANAGER" } }
    ],
    shift_policies: [{ policy_id: "S1", primary_keyholder_id: "E-MANAGER" }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "employee",
    recordId: "E-MANAGER"
  }), ["1 direct-report assignment", "1 shift-policy keyholder assignment"]);
});

test("shift policy deletion is blocked by rosters, default shifts and workflow history", () => {
  const snapshot = {
    employees: [{ employee_id: "E1", record: { default_shift_id: "S1" } }],
    shift_policies: [{ policy_id: "S1" }],
    rosters: [{ roster_id: "R1", assignments: [{ shift_id: "S1" }] }],
    module_rows: [{ row_id: "WF1", pageKey: "roster-history", details: { shift_id: "S1" } }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "shift-policy",
    recordId: "S1"
  }), ["1 roster", "1 employee default-shift assignment", "1 workflow/history record"]);
});

test("operational employee, shift and attendance references fail closed", () => {
  const missingManager = ReferentialIntegrity.validateHrmsReferences({
    employees: [{ employee_id: "E1", record: { reporting_manager_id: "E-MISSING" } }]
  });
  assert.equal(missingManager.ok, false);
  assert.equal(missingManager.blockers[0].field, "reporting_manager_id");

  const missingKeyholder = ReferentialIntegrity.validateHrmsReferences({
    employees: [{ employee_id: "E1", record: {} }],
    shift_policies: [{ policy_id: "S1", primary_keyholder_id: "E-MISSING" }]
  });
  assert.equal(missingKeyholder.ok, false);
  assert.equal(missingKeyholder.blockers[0].field, "primary_keyholder_id");

  const missingAttendanceRoster = ReferentialIntegrity.validateHrmsReferences({
    employees: [{ employee_id: "E1", record: {} }],
    attendance: [{ id: "A1", employee_id: "E1", roster_id: "R-MISSING" }]
  });
  assert.equal(missingAttendanceRoster.ok, false);
  assert.equal(missingAttendanceRoster.table, "attendance");
  assert.equal(missingAttendanceRoster.blockers[0].field, "roster_id");
});

test("roster leave days must reference an existing leave request", () => {
  const result = ReferentialIntegrity.validateHrmsReferences({
    rosters: [{ roster_id: "R1", leave_days: [{ leave_request_id: "LR-MISSING", date: "2026-08-07" }] }],
    module_rows: []
  });
  assert.equal(result.ok, false);
  assert.equal(result.table, "rosters");
  assert.equal(result.blockers[0].leave_request_id, "LR-MISSING");
});

test("duplicate Aadhaar, PAN, UAN and ESI identifiers are rejected server-side", () => {
  const employees = [{ employee_id: "E1" }, { employee_id: "E2" }];
  for (const snapshot of [
    {
      employees,
      employee_documents: [
        { document_id: "D1", employee_id: "E1", document_type: "Aadhaar", document_number: "123412341234" },
        { document_id: "D2", employee_id: "E2", document_type: "Aadhaar", document_number: "123412341234" }
      ]
    },
    {
      employees,
      employee_finance_benefits: [
        { finance_benefit_id: "F1", employee_id: "E1", uan_number: "100000000001" },
        { finance_benefit_id: "F2", employee_id: "E2", uan_number: "100000000001" }
      ]
    },
    {
      employees,
      employee_finance_benefits: [
        { finance_benefit_id: "F1", employee_id: "E1", esi_number: "1234567890" },
        { finance_benefit_id: "F2", employee_id: "E2", esi_number: "1234567890" }
      ]
    }
  ]) {
    const result = ReferentialIntegrity.validateHrmsReferences(snapshot);
    assert.equal(result.ok, false);
    assert.match(result.error, /already assigned/);
  }
});

test("holiday deletion is blocked while a roster or CO credit references it", () => {
  const snapshot = {
    holiday_calendar: [{ holiday_id: "H1", holiday_date: "2026-08-15" }],
    leave_ledger: [{ ledger_id: "L1", holiday_id: "H1" }],
    rosters: [{ roster_id: "R1", weekly_offs: [{ date: "2026-08-15" }] }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "holiday",
    recordId: "H1",
    record: snapshot.holiday_calendar[0]
  }), ["1 compensatory-off ledger entry", "1 roster"]);
});

test("roster deletion follows attendance links stored in workflow details", () => {
  const snapshot = {
    rosters: [{
      roster_id: "R-WORKFLOW",
      location_id: "LOC-1",
      start_date: "2026-08-01",
      end_date: "2026-08-31",
      status: "Published"
    }],
    attendance: [{ id: "ATT-1", employee_id: "E1", work_date: "2026-08-03", location_id: "LOC-1" }],
    module_rows: [{
      row_id: "ATT-1",
      pageKey: "attendance-list",
      details: { record_id: "ATT-1", employee_id: "E1", work_date: "2026-08-03", location_id: "LOC-1", roster_id: "R-WORKFLOW" }
    }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "roster",
    recordId: "R-WORKFLOW",
    record: snapshot.rosters[0]
  }), ["1 attendance record"]);
});

test("published roster deletion fails closed for legacy attendance with a missing roster id", () => {
  const roster = {
    roster_id: "R-PUBLISHED",
    location_id: "LOC-1",
    start_date: "2026-08-01",
    end_date: "2026-08-31",
    status: "Published"
  };
  const snapshot = {
    rosters: [roster],
    attendance: [{ id: "ATT-LEGACY", employee_id: "E1", location_id: "LOC-1", work_date: "2026-08-09" }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "roster",
    recordId: roster.roster_id,
    record: roster
  }), ["1 attendance record"]);
});

test("draft rosters are not blocked by unrelated attendance in the same period", () => {
  const roster = {
    roster_id: "R-DRAFT",
    location_id: "LOC-1",
    start_date: "2026-08-01",
    end_date: "2026-08-31",
    status: "Draft"
  };
  const snapshot = {
    rosters: [roster],
    attendance: [{ id: "ATT-1", employee_id: "E1", location_id: "LOC-1", work_date: "2026-08-09" }]
  };
  assert.deepEqual(DeleteIntegrity.collectDependencies(snapshot, {
    recordType: "roster",
    recordId: roster.roster_id,
    record: roster
  }), []);
});

test("legacy attendance roster links are repaired from workflow details and roster context", () => {
  const snapshot = {
    rosters: [
      { roster_id: "R-OLD", location_id: "LOC-1", start_date: "2026-08-01", end_date: "2026-08-31", status: "Superseded" },
      { roster_id: "R-CURRENT", location_id: "LOC-1", start_date: "2026-08-01", end_date: "2026-08-31", status: "Published" }
    ],
    attendance: [
      { id: "ATT-DETAIL", employee_id: "E1", location_id: "LOC-1", work_date: "2026-08-03", roster_id: "" },
      { id: "ATT-CONTEXT", employee_id: "E2", location_id: "LOC-1", work_date: "2026-08-04", roster_id: "" }
    ],
    module_rows: [
      { row_id: "ATT-DETAIL", pageKey: "attendance-list", details: { record_id: "ATT-DETAIL", employee_id: "E1", location_id: "LOC-1", work_date: "2026-08-03", roster_id: "R-OLD" } },
      { row_id: "ATT-CONTEXT", pageKey: "attendance-list", details: { record_id: "ATT-CONTEXT", employee_id: "E2", location_id: "LOC-1", work_date: "2026-08-04", roster_id: "R-DELETED" } }
    ]
  };
  const repaired = DeleteIntegrity.repairRosterAttendanceLinks(snapshot);
  assert.equal(repaired.changed, true);
  assert.equal(repaired.snapshot.attendance[0].roster_id, "R-OLD");
  assert.equal(repaired.snapshot.attendance[1].roster_id, "R-CURRENT");
  assert.equal(repaired.snapshot.module_rows[1].details.roster_id, "R-CURRENT");
});

test("Excel snapshot validation rejects linked deletion and allows unlinked deletion", () => {
  const linked = {
    employees: [{ employee_id: "E1", record: {} }],
    attendance: [{ id: "A1", employee_id: "E1" }]
  };
  const blocked = DeleteIntegrity.validateSnapshotDeletion(linked, {
    employees: [],
    attendance: linked.attendance
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.recordId, "E1");
  assert.deepEqual(blocked.blockers, ["1 attendance record"]);

  const unlinked = { employees: [{ employee_id: "E2", record: {} }], attendance: [] };
  assert.deepEqual(DeleteIntegrity.validateSnapshotDeletion(unlinked, {
    employees: [],
    attendance: []
  }), { ok: true, blockers: [] });
});

test("leave request deletion requires a separately persisted unlink first", () => {
  const request = {
    row_id: "LR1",
    pageKey: "leave-requests",
    details: { request_id: "LR1", review_status: "REJECTED" }
  };
  const linked = {
    employees: [{ employee_id: "E1", record: {} }],
    attendance: [{ id: "A1", employee_id: "E1", leave_request_id: "LR1" }],
    module_rows: [request]
  };
  const blocked = DeleteIntegrity.validateSnapshotDeletion(linked, {
    ...linked,
    module_rows: []
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.recordId, "LR1");
  assert.deepEqual(blocked.blockers, ["1 attendance record"]);

  const unlinked = {
    ...linked,
    attendance: [{ id: "A1", employee_id: "E1", leave_request_id: "" }]
  };
  assert.deepEqual(DeleteIntegrity.validateSnapshotDeletion(unlinked, {
    ...unlinked,
    module_rows: []
  }), { ok: true, blockers: [] });
});

test("LOP source deletion is blocked until the derived ledger is reconciled away", () => {
  const request = {
    row_id: "LR-LOP-1",
    pageKey: "leave-requests",
    details: { request_id: "LR-LOP-1", employee_id: "E1", leave_code: "LOP", review_status: "APPROVED" }
  };
  const linked = {
    module_rows: [request],
    leave_ledger: [{
      ledger_id: "LOP-E1-2026-08-08",
      employee_id: "E1",
      leave_code: "LOP",
      source_id: "LR-LOP-1",
      workflow_status: "APPROVED"
    }]
  };
  const blocked = DeleteIntegrity.validateSnapshotDeletion(linked, {
    module_rows: [],
    leave_ledger: []
  });
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.blockers, ["1 leave-ledger entry"]);

  const rejectedAndReconciled = { module_rows: [request], leave_ledger: [] };
  assert.deepEqual(DeleteIntegrity.validateSnapshotDeletion(rejectedAndReconciled, {
    module_rows: [],
    leave_ledger: []
  }), { ok: true, blockers: [] });
});

test("payroll-applied LOP transactions are immutable", () => {
  const applied = {
    ledger_id: "LOP-E1-2026-08-08",
    employee_id: "E1",
    leave_code: "LOP",
    workflow_status: "PAYROLL_APPLIED",
    payroll_status: "APPLIED"
  };
  const current = { leave_ledger: [applied] };
  const blocked = DeleteIntegrity.validateSnapshotDeletion(current, { leave_ledger: [] });
  assert.equal(blocked.ok, false);
  assert.deepEqual(blocked.blockers, ["payroll-applied transaction"]);
});

test("all current HRMS business deletes use the in-app integrity modal", () => {
  assert.match(html, /id="deleteIntegrityModal"/);
  assert.match(html, /function requestHrmsDeletion/);
  assert.match(html, /Linked data must be deleted or reassigned first/);
  assert.doesNotMatch(html, /window\.confirm\s*\(/);
  assert.doesNotMatch(html, /\bconfirm\s*\(/);
});

test("rejected leave links use an explicit audited Excel-backed unlink workflow", () => {
  assert.match(html, /data-module-floating-action="unlink-leave-request"[^>]*>[^<]*<i[^>]*data-lucide="unlink"[^>]*><\/i>Unlink Rejected Request<\/button>/);
  assert.match(html, /async function unlinkRejectedLeaveRequest/);
  assert.match(html, /REJECTED_LEAVE_UNLINKED/);
  assert.match(html, /requestHrmsUnlink/);
  assert.match(html, /if \(actionName === "unlink-leave-request"\)[\s\S]*await unlinkRejectedLeaveRequest\(rowIndex\)/);
  assert.match(html, /leave-unlink-rollback-/);
  assert.match(html, /persistenceTarget !== "excel"/);
});

test("the mock API enforces dependency validation before Excel writes", () => {
  assert.match(server, /import HrmsDeleteIntegrity from "\.\/hrms-delete-integrity\.cjs"/);
  assert.match(server, /HrmsDeleteIntegrity\.validateSnapshotDeletion\(currentSnapshot, nextSnapshot\)/);
  assert.match(server, /sendJson\(response, 409/);
});

test("manual attendance and Excel migration preserve the source roster relation", () => {
  assert.match(html, /source:\s*"MANUAL",\s*roster_id:\s*context\.roster\?\.roster_id\s*\|\|\s*""/);
  assert.match(html, /repairRosterAttendanceLinks\(snapshot\)\.snapshot/);
  assert.match(server, /pre-attendance-roster-relation-repair/);
  assert.match(server, /repairRosterAttendanceLinks\(prospectiveSnapshot\)\.snapshot/);
});
