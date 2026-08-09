(function attachHrmsDataBoundary(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HrmsDataBoundary = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHrmsDataBoundary() {
  const sharedOrganizationTables = Object.freeze([
    "tenants",
    "entities",
    "entity_gst_registrations",
    "entity_tax_registrations",
    "franchise_agreements",
    "locations",
    "country_masters",
    "state_masters",
    "pincode_masters",
    "city_masters"
  ]);
  const hrmsOwnedTables = Object.freeze([
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

  const isRoleManagerRow = record => record?.pageKey === "role-manager";
  const hrmsModuleRows = rows => (Array.isArray(rows) ? rows : []).filter(record => !isRoleManagerRow(record));

  const ownedSnapshot = snapshot => Object.fromEntries(hrmsOwnedTables.map(table => {
    const rows = table === "module_rows"
      ? hrmsModuleRows(snapshot?.module_rows)
      : Array.isArray(snapshot?.[table]) ? snapshot[table] : [];
    return [table, rows];
  }));

  const sharedFieldsPresent = snapshot => sharedOrganizationTables.filter(table =>
    Object.prototype.hasOwnProperty.call(snapshot || {}, table)
  );

  return {
    hrmsModuleRows,
    hrmsOwnedTables,
    isRoleManagerRow,
    ownedSnapshot,
    sharedFieldsPresent,
    sharedOrganizationTables
  };
});
