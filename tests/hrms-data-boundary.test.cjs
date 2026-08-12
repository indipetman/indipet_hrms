const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hrmsOwnedTables,
  ownedSnapshot,
  sharedFieldsPresent
} = require("../hrms-data-boundary.cjs");

test("HRMS persistence excludes ERP Core organization tables", () => {
  assert.deepEqual(hrmsOwnedTables, [
    "employees",
    "employee_family_members",
    "employee_documents",
    "employee_education",
    "employee_experience",
    "employee_skills",
    "employee_finance_benefits",
    "attendance",
    "attendance_policies",
    "attendance_policy_assignments",
    "attendance_penalty_rules",
    "attendance_incident_counters",
    "attendance_penalty_transactions",
    "attendance_penalty_audit",
    "in_app_notifications",
    "leave_policies",
    "leave_policy_rules",
    "leave_policy_assignments",
    "leave_ledger",
    "holiday_calendar",
    "keyholders",
    "shift_policies",
    "rosters",
    "operating_contexts",
    "module_rows"
  ]);
  const snapshot = ownedSnapshot({
    entities: [{ entity_id: "IPL101" }],
    entity_gst_registrations: [{ registration_id: "GST-IPL101-19-01" }],
    entity_tax_registrations: [{ registration_id: "TAN-IPL101" }],
    franchise_agreements: [{ agreement_id: "AGR-FRA101" }],
    locations: [{ id: "IPL101-NDP001" }],
    employees: [{ employee_id: "E1" }],
    employee_family_members: [{ family_member_id: "FM1", employee_id: "E1" }],
    employee_documents: [{ document_id: "DOC1", employee_id: "E1", document_type: "PAN" }],
    employee_education: [{ education_id: "EDU1", employee_id: "E1", qualification_level: "Graduate" }],
    employee_experience: [{ experience_id: "EXP1", employee_id: "E1" }],
    employee_skills: [{ skill_id: "SK1", employee_id: "E1", skill_name: "Retail" }],
    employee_finance_benefits: [{ finance_benefit_id: "FIN1", employee_id: "E1" }],
    attendance_policies: [{ policy_id: "P1", entity_id: "IPL101" }],
    attendance_policy_assignments: [{ assignment_id: "A1", policy_id: "P1" }],
    attendance_penalty_rules: [{ rule_id: "APR1", policy_id: "P1" }],
    attendance_incident_counters: [{ counter_id: "APC1", rule_id: "APR1" }],
    attendance_penalty_transactions: [{ transaction_id: "APT1", rule_id: "APR1" }],
    attendance_penalty_audit: [{ audit_id: "APA1", rule_id: "APR1" }],
    in_app_notifications: [{ notification_id: "NOT1", source_type: "ATTENDANCE_WARNING" }],
    leave_policies: [{ policy_id: "LP1", organization_id: "IPL101" }],
    leave_policy_rules: [{ rule_id: "LPR1", policy_id: "LP1" }],
    leave_policy_assignments: [{ assignment_id: "LPA1", policy_id: "LP1" }],
    leave_ledger: [{ ledger_id: "LL1", employee_id: "E1", leave_code: "CL" }],
    holiday_calendar: [{ holiday_id: "HOL1", organization_id: "IPL101" }],
    shift_policies: [{ policy_id: "SFP1", location_id: "IPL101-NDP001", keyholder_required: false }],
    module_rows: [
      { pageKey: "role-manager", row_id: "ADM0001" },
      { pageKey: "department-master", row_id: "RET0001" }
    ]
  });
  assert.equal("entities" in snapshot, false);
  assert.equal("entity_gst_registrations" in snapshot, false);
  assert.equal("entity_tax_registrations" in snapshot, false);
  assert.equal("franchise_agreements" in snapshot, false);
  assert.equal("locations" in snapshot, false);
  assert.deepEqual(snapshot.employees, [{ employee_id: "E1" }]);
  assert.deepEqual(snapshot.employee_family_members, [{ family_member_id: "FM1", employee_id: "E1" }]);
  assert.deepEqual(snapshot.employee_documents, [{ document_id: "DOC1", employee_id: "E1", document_type: "PAN" }]);
  assert.deepEqual(snapshot.employee_education, [{ education_id: "EDU1", employee_id: "E1", qualification_level: "Graduate" }]);
  assert.deepEqual(snapshot.employee_experience, [{ experience_id: "EXP1", employee_id: "E1" }]);
  assert.deepEqual(snapshot.employee_skills, [{ skill_id: "SK1", employee_id: "E1", skill_name: "Retail" }]);
  assert.deepEqual(snapshot.employee_finance_benefits, [{ finance_benefit_id: "FIN1", employee_id: "E1" }]);
  assert.deepEqual(snapshot.attendance_policies, [{ policy_id: "P1", entity_id: "IPL101" }]);
  assert.deepEqual(snapshot.attendance_policy_assignments, [{ assignment_id: "A1", policy_id: "P1" }]);
  assert.deepEqual(snapshot.attendance_penalty_rules, [{ rule_id: "APR1", policy_id: "P1" }]);
  assert.deepEqual(snapshot.attendance_incident_counters, [{ counter_id: "APC1", rule_id: "APR1" }]);
  assert.deepEqual(snapshot.attendance_penalty_transactions, [{ transaction_id: "APT1", rule_id: "APR1" }]);
  assert.deepEqual(snapshot.attendance_penalty_audit, [{ audit_id: "APA1", rule_id: "APR1" }]);
  assert.deepEqual(snapshot.in_app_notifications, [{ notification_id: "NOT1", source_type: "ATTENDANCE_WARNING" }]);
  assert.deepEqual(snapshot.leave_policies, [{ policy_id: "LP1", organization_id: "IPL101" }]);
  assert.deepEqual(snapshot.leave_policy_rules, [{ rule_id: "LPR1", policy_id: "LP1" }]);
  assert.deepEqual(snapshot.leave_policy_assignments, [{ assignment_id: "LPA1", policy_id: "LP1" }]);
  assert.deepEqual(snapshot.leave_ledger, [{ ledger_id: "LL1", employee_id: "E1", leave_code: "CL" }]);
  assert.deepEqual(snapshot.holiday_calendar, [{ holiday_id: "HOL1", organization_id: "IPL101" }]);
  assert.deepEqual(snapshot.shift_policies, [{ policy_id: "SFP1", location_id: "IPL101-NDP001", keyholder_required: false }]);
  assert.deepEqual(snapshot.module_rows, [{ pageKey: "department-master", row_id: "RET0001" }]);
});

test("HRMS server can detect attempts to write shared organization fields", () => {
  assert.deepEqual(sharedFieldsPresent({
    entities: [],
    entity_tax_registrations: [],
    franchise_agreements: [],
    rosters: []
  }), ["entities", "entity_tax_registrations", "franchise_agreements"]);
});
