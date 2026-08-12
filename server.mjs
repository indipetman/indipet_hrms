import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";
import HrmsDataBoundary from "./hrms-data-boundary.cjs";
import HrmsModuleRowStore from "./hrms-module-row-store.cjs";
import HrmsDeleteIntegrity from "./hrms-delete-integrity.cjs";
import HrmsReferentialIntegrity from "./hrms-referential-integrity.cjs";
import HrmsLeaveCapResolver from "./leave-cap-resolver.cjs";
import HrmsLeavePolicyRuleValidator from "./leave-policy-rule-validator.cjs";
import HrmsLossOfPayResolver from "./loss-of-pay-resolver.cjs";
import HrmsAttendancePenaltyResolver from "./attendance-penalty-resolver.cjs";
import HrmsErpConnectivity from "./hrms-erp-connectivity.cjs";
import HrmsFinancialYearIntegrity from "./hrms-financial-year-integrity.cjs";
import ProductionRuntime from "../production-runtime.cjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4318);
const dbDir = path.join(__dirname, "mock-db");
const dbPath = process.env.HRMS_DB_PATH
  ? path.resolve(process.env.HRMS_DB_PATH)
  : path.join(dbDir, "hrms_mock_database.xlsx");
const htmlPath = path.join(__dirname, "hrms_dashboard_nav_visual.html");
const employeeUploadDir = path.join(path.dirname(dbPath), "uploads", "employee-documents");
const ERP_CORE_ORIGIN = String(process.env.ERP_CORE_ORIGIN || "http://127.0.0.1:4317").replace(/\/$/, "");
const REQUIRE_ERP_CORE = process.env.HRMS_REQUIRE_ERP_CORE !== "0";
const TENANT_ID = String(process.env.INDIPET_TENANT_ID || "TEN-INDIPET").trim();
const productionRuntime = ProductionRuntime.assertProductionRuntime({
  appName: "indipet_hrms",
  appDir: __dirname,
  databasePaths: [dbPath],
  allowedDatabaseNames: ["hrms_mock_database.xlsx"]
});

async function readErpOrganizationSnapshot() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const ownershipResponse = await fetch(`${ERP_CORE_ORIGIN}/api/erp-core/ownership`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (ownershipResponse.ok) {
      const snapshot = await ownershipResponse.json();
      return snapshot && typeof snapshot === "object" ? snapshot : null;
    }
    if (ownershipResponse.status !== 404) {
      throw new Error(`ERP Core ownership check returned ${ownershipResponse.status}`);
    }

    const legacyResponse = await fetch(`${ERP_CORE_ORIGIN}/api/erp-core/organization`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!legacyResponse.ok) throw new Error(`ERP Core organization check returned ${legacyResponse.status}`);
    const snapshot = await legacyResponse.json();
    return snapshot && typeof snapshot === "object" ? snapshot : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function validateErpOrganizationConnectivity(snapshot) {
  if (!HrmsErpConnectivity.needsOrganizationSnapshot(snapshot)) {
    return { ok: true, blockers: [], snapshot };
  }
  if (!REQUIRE_ERP_CORE) {
    return { ok: true, blockers: [], snapshot: HrmsErpConnectivity.stampTenantOwnership(snapshot, TENANT_ID) };
  }
  const organization = await readErpOrganizationSnapshot();
  const ownership = HrmsErpConnectivity.applyTenantOwnership(snapshot, organization);
  if (!ownership.ok) return ownership;
  const financialYearValidation = HrmsFinancialYearIntegrity.stampAndValidate(ownership.snapshot, organization);
  if (!financialYearValidation.ok) return financialYearValidation;
  const scopedSnapshot = financialYearValidation.snapshot || ownership.snapshot;
  const validation = HrmsErpConnectivity.validateAgainstOrganization(scopedSnapshot, organization);
  return validation.ok ? { ...validation, snapshot: scopedSnapshot, tenant_id: ownership.tenant_id } : validation;
}

const modulePageKey = record => String(record?.pageKey || record?.page_key || "").trim().toLowerCase();
const moduleDetails = record => record?.details && typeof record.details === "object" ? record.details : {};
const moduleRecordId = record => {
  const details = moduleDetails(record);
  const pageKey = modulePageKey(record);
  const businessId = pageKey === "department-master"
    ? details.department_id || details.department_code || record?.department_id || record?.department_code || record?.cells?.[0]
    : pageKey === "designation-master"
      ? details.designation_id || details.designation_code || record?.designation_id || record?.designation_code || record?.cells?.[0]
      : "";
  return String(businessId || record?.row_id || record?.id || "").trim();
};
const moduleRecordName = record => String(
  record?.name || moduleDetails(record).department_name || moduleDetails(record).designation_name || record?.cells?.[1] || ""
).trim();

function removedErpReferencedMasters(currentSnapshot = {}, nextSnapshot = {}) {
  const supported = new Map([
    ["department-master", "department"],
    ["designation-master", "designation"]
  ]);
  const identityKey = record => {
    const recordType = supported.get(modulePageKey(record));
    const recordId = moduleRecordId(record);
    return recordType && recordId ? `${recordType}:${recordId}` : "";
  };
  const nextIds = new Set((nextSnapshot.module_rows || []).map(identityKey).filter(Boolean));
  return (currentSnapshot.module_rows || [])
    .filter(record => supported.has(modulePageKey(record)))
    .filter(record => identityKey(record) && !nextIds.has(identityKey(record)))
    .map(record => ({
      recordType: supported.get(modulePageKey(record)),
      recordId: moduleRecordId(record),
      recordName: moduleRecordName(record)
    }));
}

async function validateErpServiceDeleteDependencies(currentSnapshot, nextSnapshot) {
  const removed = removedErpReferencedMasters(currentSnapshot, nextSnapshot);
  if (!removed.length || !REQUIRE_ERP_CORE) return { ok: true, blockers: [] };
  for (const record of removed) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const query = new URLSearchParams({
        record_type: record.recordType,
        record_id: record.recordId,
        record_name: record.recordName
      });
      const response = await fetch(`${ERP_CORE_ORIGIN}/api/delete-dependencies?${query}`, {
        cache: "no-store",
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || `ERP dependency check returned ${response.status}`);
      if (Array.isArray(result.blockers) && result.blockers.length) {
        return {
          ok: false,
          table: "module_rows",
          recordId: record.recordId,
          blockers: result.blockers,
          error: `Delete blocked for ${record.recordName || record.recordId}. Remove or reassign linked ERP services first: ${result.blockers.join(", ")}.`
        };
      }
    } catch {
      return {
        ok: false,
        unavailable: true,
        table: "module_rows",
        recordId: record.recordId,
        blockers: ["ERP Service Master dependency check unavailable"],
        error: "Delete blocked because ERP Service Master dependencies could not be loaded. Start ERP Core and retry."
      };
    } finally {
      clearTimeout(timeout);
    }
  }
  return { ok: true, blockers: [] };
}

const workbookRevision = () => {
  try {
    const stats = fs.statSync(dbPath);
    return `${stats.size}-${Math.trunc(stats.mtimeMs)}`;
  } catch {
    return "missing";
  }
};

const jsonFields = new Set([
  "details", "access", "record", "services", "deliveryZones", "shifts", "shiftPolicyRecords", "operatingHoursRecords", "cells",
  "permissions", "permission_matrix", "permission_codes",
  "assignments", "weekly_offs", "draft_weekly_offs", "weekly_off_allowances", "leave_days",
  "rotation_exceptions", "open_slots", "conflicts_list", "warnings_list", "comp_off_entries", "excluded", "history", "rules",
  "qualifying_attendance_ids", "source_attendance_ids", "source_dates", "payload",
  "scope_keys", "scope_labels"
]);
const booleanFields = new Set([
  "gstRegistered", "keyholderEligible", "weekly_off_baseline_ready",
  "paid", "carry_forward_enabled", "proof_required", "store_closed", "co_eligible",
  "keyholder_required", "is_spouse", "pf_applicable", "esi_applicable"
]);
const numberFields = new Set([
  "readiness", "calendar_year", "opening_balance", "accrued_days", "used_days",
  "adjusted_days", "pending_days", "available_days", "break_duration_minutes",
  "total_shift_hours", "net_work_hours", "sanctioned_strength", "max_leave_per_day",
  "weekly_off_day", "max_consecutive_days", "version", "file_size_bytes", "passing_year", "years_experience",
  "units", "lop_units", "occurrence_threshold", "counting_period_value", "consequence_units", "priority",
  "occurrence_count", "consumed_count"
]);
const compressedJsonPrefix = "__HRMS_GZIP_BASE64__:";
const excelSafeJsonLength = 30000;

const tableConfig = {
  employees: {
    key: "employee_id",
    headers: ["employee_id", "employee_name", "location", "designation", "profile_status", "status", "record"]
  },
  employee_family_members: {
    key: "family_member_id",
    headers: [
      "family_member_id", "employee_id", "member_name", "relationship", "phone_number",
      "is_spouse", "status", "created_at", "updated_at"
    ]
  },
  employee_documents: {
    key: "document_id",
    headers: [
      "document_id", "employee_id", "document_type", "document_number", "file_name", "stored_path",
      "mime_type", "file_size_bytes", "verification_status", "verification_source", "verified_at",
      "verified_by", "status", "created_at", "updated_at"
    ]
  },
  employee_education: {
    key: "education_id",
    headers: [
      "education_id", "employee_id", "qualification_level", "qualification_other", "course_name",
      "institution", "board_university", "passing_year", "grade_percentage", "education_status",
      "certificate_document_id", "created_at", "updated_at"
    ]
  },
  employee_experience: {
    key: "experience_id",
    headers: [
      "experience_id", "employee_id", "employer_name", "designation", "start_date", "end_date",
      "years_experience", "reference_number", "experience_document_id", "created_at", "updated_at"
    ]
  },
  employee_skills: {
    key: "skill_id",
    headers: [
      "skill_id", "employee_id", "skill_name", "skill_level", "years_experience",
      "certification_document_id", "created_at", "updated_at"
    ]
  },
  employee_finance_benefits: {
    key: "finance_benefit_id",
    headers: [
      "finance_benefit_id", "employee_id", "bank_name", "branch_name", "account_number", "ifsc_code",
      "bank_verification_status", "pf_applicable", "uan_number", "pf_member_id", "pf_status",
      "esi_applicable", "esi_number", "esi_status", "nominee_name", "nominee_relationship",
      "status", "created_at", "updated_at"
    ]
  },
  attendance: {
    key: "id",
    headers: [
      "id", "financial_year_id", "employee_id", "name", "initials", "entity_id", "location_id", "location",
      "work_date", "shift", "checkIn", "checkOut", "worked_minutes", "issue", "status", "source",
      "roster_id", "source_id", "leave_request_id", "policy_id"
    ]
  },
  attendance_policies: {
    key: "policy_id",
    headers: [
      "policy_id", "financial_year_id", "entity_id", "policy_code", "policy_name", "status", "version",
      "rules", "history", "created_at", "updated_at"
    ]
  },
  attendance_policy_assignments: {
    key: "assignment_id",
    headers: [
      "assignment_id", "policy_id", "entity_id", "assignment_mode", "target_type",
      "target_key", "target_label", "created_at"
    ]
  },
  attendance_penalty_rules: {
    key: "rule_id",
    headers: [
      "rule_id", "policy_id", "rule_name", "incident_code", "occurrence_threshold",
      "counting_period_type", "counting_period_value", "consequence_type", "leave_code",
      "consequence_units", "insufficient_balance_action", "priority", "status", "created_at", "updated_at"
    ]
  },
  attendance_incident_counters: {
    key: "counter_id",
    headers: [
      "counter_id", "financial_year_id", "rule_id", "policy_id", "employee_id", "period_key", "incident_code",
      "occurrence_count", "consumed_count", "qualifying_attendance_ids", "status",
      "last_incident_date", "created_at", "updated_at"
    ]
  },
  attendance_penalty_transactions: {
    key: "transaction_id",
    headers: [
      "transaction_id", "financial_year_id", "rule_id", "policy_id", "employee_id", "employee_name", "entity_id",
      "location_id", "period_key", "incident_code", "occurrence_threshold", "source_attendance_ids",
      "source_dates", "consequence_type", "leave_code", "units", "fallback_action", "workflow_status",
      "ledger_id", "reversal_reason", "reversed_at", "created_at", "updated_at"
    ]
  },
  attendance_penalty_audit: {
    key: "audit_id",
    headers: [
      "audit_id", "transaction_id", "rule_id", "employee_id", "action", "detail", "payload", "created_at"
    ]
  },
  in_app_notifications: {
    key: "notification_id",
    headers: [
      "notification_id", "source_type", "source_id", "recipient_type", "recipient_employee_id",
      "employee_name", "entity_id", "location_id", "title", "message", "severity", "status",
      "read_status", "action_page", "period_key", "incident_code", "occurrence_threshold",
      "source_dates", "payload", "created_at", "updated_at", "read_at", "resolved_at"
    ]
  },
  leave_policies: {
    key: "policy_id",
    headers: [
      "policy_id", "financial_year_id", "organization_id", "policy_code", "policy_name", "status", "version",
      "history", "created_at", "updated_at"
    ]
  },
  leave_policy_rules: {
    key: "rule_id",
    headers: [
      "rule_id", "policy_id", "leave_code", "leave_name", "paid", "annual_entitlement_days",
      "accrual_method", "carry_forward_enabled", "max_carry_forward_days", "proof_required",
      "minimum_days", "maximum_days", "status"
    ]
  },
  leave_policy_assignments: {
    key: "assignment_id",
    headers: [
      "assignment_id", "policy_id", "organization_id", "assignment_mode", "target_type",
      "target_key", "target_label", "created_at"
    ]
  },
  leave_ledger: {
    key: "ledger_id",
    headers: [
      "ledger_id", "financial_year_id", "employee_id", "employee_name", "organization_id", "location_id", "location",
      "policy_id", "leave_code", "leave_name", "opening_balance", "accrued_days", "used_days",
      "adjusted_days", "pending_days", "available_days", "transaction_date", "as_of_date", "status",
      "source_type", "source_id", "holiday_id", "units", "pay_treatment", "workflow_status",
      "payroll_period", "payroll_status", "payroll_applied_at", "reversed_entry_id",
      "created_at", "updated_at", "history"
    ]
  },
  holiday_calendar: {
    key: "holiday_id",
    headers: [
      "holiday_id", "financial_year_id", "organization_id", "holiday_date", "holiday_name", "holiday_type",
      "scope_type", "scope_key", "scope_label", "scope_keys", "scope_labels", "store_closed", "co_eligible",
      "calendar_year", "status", "created_at", "updated_at"
    ]
  },
  keyholders: {
    key: "id",
    headers: ["id", "name", "locationId", "status", "keyholderEligible"]
  },
  shift_policies: {
    key: "policy_id",
    headers: [
      "policy_id", "location_id", "policy_name", "coverage_role", "shift_start_time",
      "shift_end_time", "break_duration_minutes", "total_shift_hours", "net_work_hours",
      "sanctioned_strength", "max_leave_per_day", "keyholder_required",
      "primary_keyholder_id", "backup_keyholder_id", "weekly_off_pattern", "weekly_off_day",
      "max_consecutive_days", "policy_status", "version", "created_at", "updated_at"
    ]
  },
  rosters: {
    key: "roster_id",
    headers: [
      "roster_id", "financial_year_id", "location_id", "period", "start_date", "end_date", "version", "status",
      "filled", "open", "conflicts", "keyholder", "updated", "issue", "leave_handling", "assignments", "weekly_offs",
      "draft_weekly_offs", "weekly_off_allowances", "weekly_off_baseline_ready", "leave_days",
      "rotation_exceptions", "open_slots", "conflicts_list", "warnings_list", "override_reason",
      "override_warning_signature", "comp_off_entries", "excluded", "history"
    ]
  },
  operating_contexts: {
    key: "context_id",
    headers: ["context_id", "primary_entity_id", "active_entity_id", "entity_name", "admin_name", "admin_phone", "status"]
  },
  module_rows: {
    key: "row_id",
    headers: [
      "row_id", "financial_year_id", "pageKey", "role_id", "role_code", "role_name", "name", "module_scope", "scope",
      "entity_context", "data_scope", "location_rule", "permissions", "permission_matrix", "permission_codes",
      "users", "lastChanged", "last_changed", "status", "details", "cells"
    ]
  }
};

Object.values(tableConfig).forEach(config => {
  if (!config.headers.includes("tenant_id")) config.headers.unshift("tenant_id");
});

const seedData = Object.fromEntries(Object.keys(tableConfig).map(tableName => [tableName, []]));

const serializeJsonCell = value => {
  const json = JSON.stringify(value);
  if (json.length <= excelSafeJsonLength) return json;
  const compressed = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 }).toString("base64");
  return `${compressedJsonPrefix}${compressed}`;
};

const parseJsonCell = value => {
  const text = String(value || "");
  if (!text.startsWith(compressedJsonPrefix)) return JSON.parse(text);
  const compressed = text.slice(compressedJsonPrefix.length);
  const json = zlib.gunzipSync(Buffer.from(compressed, "base64")).toString("utf8");
  return JSON.parse(json);
};

const serializeRecord = (record, headers) => Object.fromEntries(headers.map(header => {
  const value = record[header];
  if (Array.isArray(value) || (value && typeof value === "object")) return [header, serializeJsonCell(value)];
  if (typeof value === "boolean") return [header, value ? "TRUE" : "FALSE"];
  return [header, value ?? ""];
}));

const worksheetColumnWidths = headers => headers.map(header => ({ wch: Math.min(34, Math.max(12, String(header).length + 2)) }));

const applyWorksheetColumnWidths = (sheet, headers) => {
  const expected = worksheetColumnWidths(headers);
  const current = Array.isArray(sheet?.["!cols"]) ? sheet["!cols"] : [];
  const changed = current.length !== expected.length || expected.some((column, index) => Number(current[index]?.wch) !== column.wch);
  if (changed) sheet["!cols"] = expected;
  return changed;
};

const worksheetFromRows = (rows, headers) => {
  const sheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  sheet["!cols"] = worksheetColumnWidths(headers);
  return sheet;
};

const normalizeRecord = record => Object.fromEntries(Object.entries(record).map(([key, value]) => {
  if (jsonFields.has(key)) {
    if (!value) return [key, ["cells", "permission_codes"].includes(key) ? [] : {}];
    if (typeof value !== "string") return [key, value];
    try { return [key, parseJsonCell(value)]; } catch { return [key, value]; }
  }
  if (booleanFields.has(key)) {
    const text = String(value).toLowerCase();
    return [key, value === true || text === "true" || text === "yes" || text === "1"];
  }
  if (numberFields.has(key)) {
    if (value === "" || value === null || value === undefined) return [key, 0];
    const number = Number(value);
    return [key, Number.isFinite(number) ? number : 0];
  }
  return [key, value ?? ""];
}));

const stripObsoleteEmployeeFields = record => {
  const normalized = { ...record };
  if (normalized.record && typeof normalized.record === "object" && !Array.isArray(normalized.record)) {
    normalized.record = { ...normalized.record };
    [
      "face_registered",
      "emergency_contact_name",
      "emergency_relationship",
      "emergency_phone",
      "emergency_alt_phone",
      "emergency_address",
      "guardian_name",
      "spouse_name",
      "aadhaar_number", "pan_number", "document_type", "document_number", "document_status",
      "primary_skill", "skill_level", "uan_number", "pf_number", "esi_number", "nominee_name",
      "bank_name", "branch_name", "account_number", "ifsc_code", "bank_verification_status"
    ].forEach(field => delete normalized.record[field]);
  }
  return normalized;
};

const normalizeHolidayCalendarRecord = record => {
  const normalized = { ...record };
  const legacyScopeKey = String(normalized.scope_key || "").trim();
  const legacyScopeLabel = String(normalized.scope_label || "").trim();
  const scopeKeys = Array.isArray(normalized.scope_keys)
    ? normalized.scope_keys.map(value => String(value || "").trim()).filter(Boolean)
    : [];
  const scopeLabels = Array.isArray(normalized.scope_labels)
    ? normalized.scope_labels.map(value => String(value || "").trim()).filter(Boolean)
    : [];
  if (!scopeKeys.length && legacyScopeKey) scopeKeys.push(legacyScopeKey);
  if (!scopeLabels.length && legacyScopeLabel) scopeLabels.push(legacyScopeLabel);
  if (!scopeKeys.length && String(normalized.scope_type || "").toUpperCase() === "FULL_COVERAGE") {
    scopeKeys.push("FULL_COVERAGE");
  }
  if (!scopeLabels.length && scopeKeys.length === 1 && scopeKeys[0] === "FULL_COVERAGE") {
    scopeLabels.push("Full Coverage");
  }
  const normalizedScopeKeys = [];
  const normalizedScopeLabels = [];
  const seenScopeKeys = new Set();
  scopeKeys.forEach((key, index) => {
    if (seenScopeKeys.has(key)) return;
    seenScopeKeys.add(key);
    normalizedScopeKeys.push(key);
    normalizedScopeLabels.push(scopeLabels[index] || key);
  });
  if (String(normalized.scope_type || "").toUpperCase() === "FULL_COVERAGE") {
    normalized.scope_keys = ["FULL_COVERAGE"];
    normalized.scope_labels = ["Full Coverage"];
  } else {
    normalized.scope_keys = normalizedScopeKeys;
    normalized.scope_labels = normalizedScopeLabels;
  }
  normalized.scope_key = normalized.scope_keys[0] || legacyScopeKey;
  normalized.scope_label = normalized.scope_labels[0] || legacyScopeLabel;
  return normalized;
};

const normalizeTableRecord = (tableName, record) => {
  const normalized = normalizeRecord(record);
  if (tableName === "employees") return stripObsoleteEmployeeFields(normalized);
  if (tableName === "holiday_calendar") return normalizeHolidayCalendarRecord(normalized);
  return normalized;
};

const migrateHrmsTenantRecord = (tableName, record) => {
  const normalized = { ...record, tenant_id: String(record?.tenant_id || TENANT_ID).trim() };
  if (tableName === "employees" && normalized.record && typeof normalized.record === "object") {
    normalized.record = { ...normalized.record, tenant_id: normalized.tenant_id };
  }
  return normalized;
};

const employeeStructuredTableNames = [
  "employee_documents", "employee_education", "employee_experience", "employee_skills", "employee_finance_benefits"
];

const legacyEmployeeStructuredFields = [
  "aadhaar_number", "pan_number", "document_type", "document_number", "document_status",
  "primary_skill", "skill_level", "uan_number", "pf_number", "esi_number", "nominee_name",
  "bank_name", "branch_name", "account_number", "ifsc_code", "bank_verification_status"
];

const mergeRowsByKey = (tableName, existingRows = [], legacyRows = []) => {
  const key = tableConfig[tableName].key;
  const merged = new Map(existingRows.map(row => [String(row[key] || "").trim(), row]));
  legacyRows.forEach(row => {
    const rowKey = String(row[key] || "").trim();
    if (rowKey && !merged.has(rowKey)) merged.set(rowKey, row);
  });
  return [...merged.values()];
};

const ensureWorkbook = () => {
  fs.mkdirSync(dbDir, { recursive: true });
  const workbookExists = fs.existsSync(dbPath);
  const workbook = workbookExists
    ? XLSX.readFile(dbPath, { cellDates: false })
    : XLSX.utils.book_new();
  const holidayCalendarHeaderRow = workbook.Sheets.holiday_calendar
    ? XLSX.utils.sheet_to_json(workbook.Sheets.holiday_calendar, { header: 1, defval: "" })[0] || []
    : [];
  const holidayScopeHeaders = new Set(["scope_keys", "scope_labels"]);
  const needsHolidayScopeMigration = workbookExists
    && Boolean(workbook.Sheets.holiday_calendar)
    && [...holidayScopeHeaders].some(header => !holidayCalendarHeaderRow.includes(header));
  const tenantOwnershipMigrationTables = new Set(workbookExists
    ? Object.entries(tableConfig)
      .filter(([tableName, config]) => {
        const sheet = workbook.Sheets[tableName];
        if (!sheet) return false;
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })[0] || [];
        return config.headers.some(header => !headers.includes(header)
          && !(tableName === "holiday_calendar" && holidayScopeHeaders.has(header)));
      })
      .map(([tableName]) => tableName)
    : []);
  const needsLeaveLedgerMigration = workbookExists && !workbook.Sheets.leave_ledger;
  const leaveLedgerHeaderRow = workbook.Sheets.leave_ledger
    ? XLSX.utils.sheet_to_json(workbook.Sheets.leave_ledger, { header: 1, defval: "" })[0] || []
    : [];
  const needsLeaveLedgerColumnMigration = workbookExists
    && Boolean(workbook.Sheets.leave_ledger)
    && tableConfig.leave_ledger.headers.some(header => !leaveLedgerHeaderRow.includes(header));
  const needsShiftPolicyMigration = workbookExists && !workbook.Sheets.shift_policies;
  const needsInAppNotificationsMigration = workbookExists && !workbook.Sheets.in_app_notifications;
  const attendanceHeaderRow = workbook.Sheets.attendance
    ? XLSX.utils.sheet_to_json(workbook.Sheets.attendance, { header: 1, defval: "" })[0] || []
    : [];
  const needsAttendanceColumnMigration = workbookExists
    && Boolean(workbook.Sheets.attendance)
    && tableConfig.attendance.headers.some(header => !attendanceHeaderRow.includes(header));
  const rosterHeaderRow = workbook.Sheets.rosters
    ? XLSX.utils.sheet_to_json(workbook.Sheets.rosters, { header: 1, defval: "" })[0] || []
    : [];
  const needsRosterColumnMigration = workbookExists
    && Boolean(workbook.Sheets.rosters)
    && tableConfig.rosters.headers.some(header => !rosterHeaderRow.includes(header));
  const employeeRowsForFamilyMigration = workbook.Sheets.employees
    ? XLSX.utils.sheet_to_json(workbook.Sheets.employees, { defval: "" }).map(normalizeRecord)
    : [];
  const existingEmployeeFamilyRows = workbook.Sheets.employee_family_members
    ? XLSX.utils.sheet_to_json(workbook.Sheets.employee_family_members, { defval: "" }).map(normalizeRecord)
    : [];
  const existingEmployeeStructuredRows = Object.fromEntries(employeeStructuredTableNames.map(tableName => [
    tableName,
    workbook.Sheets[tableName]
      ? XLSX.utils.sheet_to_json(workbook.Sheets[tableName], { defval: "" }).map(normalizeRecord)
      : []
  ]));
  const legacyFamilyRows = employeeRowsForFamilyMigration.flatMap(employee => {
    const detail = employee.record && typeof employee.record === "object" && !Array.isArray(employee.record)
      ? employee.record
      : {};
    const employeeId = String(employee.employee_id || detail.employee_id || "").trim();
    if (!employeeId) return [];
    const safeEmployeeId = employeeId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const createdAt = new Date().toISOString();
    return [
      detail.guardian_name ? {
        family_member_id: `FM-${safeEmployeeId}-LEGACY-GUARDIAN`,
        employee_id: employeeId,
        member_name: detail.guardian_name,
        relationship: "Guardian",
        phone_number: "",
        is_spouse: false,
        status: "Active",
        created_at: createdAt,
        updated_at: createdAt
      } : null,
      detail.spouse_name ? {
        family_member_id: `FM-${safeEmployeeId}-LEGACY-SPOUSE`,
        employee_id: employeeId,
        member_name: detail.spouse_name,
        relationship: "Spouse",
        phone_number: "",
        is_spouse: true,
        status: "Active",
        created_at: createdAt,
        updated_at: createdAt
      } : null
    ].filter(Boolean);
  });
  const existingFamilyIds = new Set(existingEmployeeFamilyRows.map(row => String(row.family_member_id || "").trim()));
  const migratedEmployeeFamilyRows = [
    ...existingEmployeeFamilyRows,
    ...legacyFamilyRows.filter(row => !existingFamilyIds.has(row.family_member_id))
  ];
  const needsEmployeeProfileCleanup = employeeRowsForFamilyMigration.some(employee => {
    const detail = employee.record && typeof employee.record === "object" && !Array.isArray(employee.record)
      ? employee.record
      : {};
    return Object.prototype.hasOwnProperty.call(detail, "guardian_name")
      || Object.prototype.hasOwnProperty.call(detail, "spouse_name")
      || legacyEmployeeStructuredFields.some(field => Object.prototype.hasOwnProperty.call(detail, field));
  });
  const needsEmployeeFamilyMigration = workbookExists
    && (!workbook.Sheets.employee_family_members || migratedEmployeeFamilyRows.length !== existingEmployeeFamilyRows.length || needsEmployeeProfileCleanup);
  const legacyEmployeeStructuredRows = employeeRowsForFamilyMigration.reduce((tables, employee) => {
    const detail = employee.record && typeof employee.record === "object" && !Array.isArray(employee.record)
      ? employee.record
      : {};
    const employeeId = String(employee.employee_id || detail.employee_id || "").trim();
    if (!employeeId) return tables;
    const safeEmployeeId = employeeId.replace(/[^A-Za-z0-9_-]+/g, "-");
    const now = new Date().toISOString();
    const addDocument = (kind, number, status = "Pending") => {
      if (!number) return;
      tables.employee_documents.push({
        document_id: `DOC-${safeEmployeeId}-${kind.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
        employee_id: employeeId,
        document_type: kind,
        document_number: number,
        verification_status: status || "Pending",
        verification_source: "Legacy employee profile migration",
        status: "Active",
        created_at: now,
        updated_at: now
      });
    };
    addDocument("Aadhaar", detail.aadhaar_number, detail.aadhaar_verification_status);
    addDocument("PAN", detail.pan_number, detail.pan_verification_status);
    if (detail.document_type || detail.document_number) addDocument(detail.document_type || "Supporting Document", detail.document_number, detail.document_status);
    if (detail.primary_skill) {
      tables.employee_skills.push({
        skill_id: `SKILL-${safeEmployeeId}-PRIMARY`,
        employee_id: employeeId,
        skill_name: detail.primary_skill,
        skill_level: detail.skill_level || "",
        created_at: now,
        updated_at: now
      });
    }
    if ([
      detail.bank_name, detail.branch_name, detail.account_number, detail.ifsc_code, detail.bank_verification_status,
      detail.uan_number, detail.pf_number, detail.esi_number, detail.nominee_name
    ].some(Boolean)) {
      tables.employee_finance_benefits.push({
        finance_benefit_id: `FIN-${safeEmployeeId}`,
        employee_id: employeeId,
        bank_name: detail.bank_name || "",
        branch_name: detail.branch_name || "",
        account_number: detail.account_number || "",
        ifsc_code: detail.ifsc_code || "",
        bank_verification_status: detail.bank_verification_status || "",
        pf_applicable: Boolean(detail.uan_number || detail.pf_number),
        uan_number: detail.uan_number || "",
        pf_member_id: detail.pf_number || "",
        pf_status: detail.uan_number || detail.pf_number ? "Registered" : "",
        esi_applicable: Boolean(detail.esi_number),
        esi_number: detail.esi_number || "",
        esi_status: detail.esi_number ? "Registered" : "",
        nominee_name: detail.nominee_name || "",
        status: "Active",
        created_at: now,
        updated_at: now
      });
    }
    return tables;
  }, Object.fromEntries(employeeStructuredTableNames.map(tableName => [tableName, []])));
  const migratedEmployeeStructuredRows = Object.fromEntries(employeeStructuredTableNames.map(tableName => [
    tableName,
    mergeRowsByKey(tableName, existingEmployeeStructuredRows[tableName], legacyEmployeeStructuredRows[tableName])
  ]));
  const needsEmployeeStructuredMigration = workbookExists && (
    employeeStructuredTableNames.some(tableName => !workbook.Sheets[tableName])
    || needsEmployeeProfileCleanup
    || employeeStructuredTableNames.some(tableName => migratedEmployeeStructuredRows[tableName].length !== existingEmployeeStructuredRows[tableName].length)
  );
  if (tenantOwnershipMigrationTables.size) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(path.dirname(dbPath), `hrms_mock_database.pre-tenant-ownership-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsInAppNotificationsMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(path.dirname(dbPath), `hrms_mock_database.pre-in-app-notifications-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsShiftPolicyMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dbDir, `hrms_mock_database.pre-shift-policies-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsLeaveLedgerMigration || needsLeaveLedgerColumnMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupLabel = needsLeaveLedgerColumnMigration ? "pre-leave-ledger-source-columns" : "pre-leave-ledger";
    const backupPath = path.join(dbDir, `hrms_mock_database.${backupLabel}-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsAttendanceColumnMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dbDir, `hrms_mock_database.pre-attendance-link-columns-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsRosterColumnMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dbDir, `hrms_mock_database.pre-roster-leave-handling-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsEmployeeFamilyMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dbDir, `hrms_mock_database.pre-employee-family-members-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsEmployeeStructuredMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(dbDir, `hrms_mock_database.pre-document-center-finance-benefits-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  if (needsHolidayScopeMigration) {
    const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(path.dirname(dbPath), `hrms_mock_database.pre-holiday-multi-scope-${backupStamp}.xlsx`);
    fs.copyFileSync(dbPath, backupPath);
  }
  const legacyCoRows = needsLeaveLedgerMigration && workbook.Sheets.module_rows
    ? XLSX.utils.sheet_to_json(workbook.Sheets.module_rows, { defval: "" })
      .map(normalizeRecord)
      .filter(record => record.pageKey === "co-ledger")
    : [];
  const migratedLeaveLedgerRows = legacyCoRows.map((record, index) => {
    const cells = Array.isArray(record.cells) ? record.cells : [];
    const details = record.details && typeof record.details === "object" ? record.details : {};
    const units = Math.max(0, Number.parseFloat(String(cells[2] || "0")) || 0);
    const displayDate = String(cells[3] || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const asOfDate = displayDate ? `${displayDate[3]}-${displayDate[2]}-${displayDate[1]}` : "";
    return {
      ledger_id: `leave-ledger-migrated-${record.row_id || index + 1}`,
      employee_id: details.employee_id || "",
      employee_name: cells[0] || "",
      organization_id: details.entity_id || "",
      location_id: details.location_id || "",
      location: details.location || "",
      policy_id: "",
      leave_code: "CO",
      leave_name: "Compensatory Off",
      opening_balance: 0,
      accrued_days: 0,
      used_days: 0,
      adjusted_days: 0,
      pending_days: units,
      available_days: 0,
      as_of_date: asOfDate,
      status: cells[4] || "Pending Attendance",
      history: [{
        action: "Migrated from CO Ledger",
        detail: cells.slice(1).join(" | "),
        at: new Date().toISOString()
      }]
    };
  });
  let changed = false;
  for (const [tableName, config] of Object.entries(tableConfig)) {
    if (workbook.Sheets[tableName]) {
      if (applyWorksheetColumnWidths(workbook.Sheets[tableName], config.headers)) changed = true;
      if ((tableName === "leave_ledger" && needsLeaveLedgerColumnMigration)
        || (tableName === "attendance" && needsAttendanceColumnMigration)
        || (tableName === "rosters" && needsRosterColumnMigration)
        || (tableName === "holiday_calendar" && needsHolidayScopeMigration)
        || tenantOwnershipMigrationTables.has(tableName)
        || (tableName === "employees" && needsEmployeeProfileCleanup)
        || (tableName === "employee_family_members" && needsEmployeeFamilyMigration)
        || (employeeStructuredTableNames.includes(tableName) && needsEmployeeStructuredMigration)) {
        const existingRows = XLSX.utils.sheet_to_json(workbook.Sheets[tableName], { defval: "" })
          .map(record => normalizeTableRecord(tableName, record));
        const migratedRows = tableName === "employee_family_members"
          ? migratedEmployeeFamilyRows
          : employeeStructuredTableNames.includes(tableName)
            ? migratedEmployeeStructuredRows[tableName]
          : tableName === "employees"
            ? existingRows.map(stripObsoleteEmployeeFields)
            : existingRows;
        workbook.Sheets[tableName] = worksheetFromRows(
          migratedRows
            .map(record => migrateHrmsTenantRecord(tableName, record))
            .map(record => serializeRecord(record, config.headers)),
          config.headers
        );
        changed = true;
      }
      continue;
    }
    const initialRows = tableName === "leave_ledger"
      ? migratedLeaveLedgerRows
      : tableName === "employee_family_members"
        ? migratedEmployeeFamilyRows
        : employeeStructuredTableNames.includes(tableName)
          ? migratedEmployeeStructuredRows[tableName]
        : seedData[tableName];
    const rows = initialRows.map(record => serializeRecord(record, config.headers));
    const sheet = worksheetFromRows(rows, config.headers);
    XLSX.utils.book_append_sheet(workbook, sheet, tableName);
    changed = true;
  }
  if (needsLeaveLedgerMigration && legacyCoRows.length && workbook.Sheets.module_rows) {
    const moduleConfig = tableConfig.module_rows;
    const remainingRows = XLSX.utils.sheet_to_json(workbook.Sheets.module_rows, { defval: "" })
      .map(normalizeRecord)
      .filter(record => record.pageKey !== "co-ledger");
    workbook.Sheets.module_rows = worksheetFromRows(
      remainingRows.map(record => serializeRecord(record, moduleConfig.headers)),
      moduleConfig.headers
    );
    changed = true;
  }
  if (workbook.Sheets.rosters && workbook.Sheets.attendance && workbook.Sheets.module_rows) {
    const relationSnapshot = {
      rosters: XLSX.utils.sheet_to_json(workbook.Sheets.rosters, { defval: "" }).map(normalizeRecord),
      attendance: XLSX.utils.sheet_to_json(workbook.Sheets.attendance, { defval: "" }).map(normalizeRecord),
      module_rows: XLSX.utils.sheet_to_json(workbook.Sheets.module_rows, { defval: "" }).map(normalizeRecord)
    };
    const relationRepair = HrmsDeleteIntegrity.repairRosterAttendanceLinks(relationSnapshot);
    if (relationRepair.changed) {
      if (workbookExists) {
        const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path.join(dbDir, `hrms_mock_database.pre-attendance-roster-relation-repair-${backupStamp}.xlsx`);
        fs.copyFileSync(dbPath, backupPath);
      }
      workbook.Sheets.attendance = worksheetFromRows(
        relationRepair.snapshot.attendance.map(record => serializeRecord(record, tableConfig.attendance.headers)),
        tableConfig.attendance.headers
      );
      workbook.Sheets.module_rows = worksheetFromRows(
        relationRepair.snapshot.module_rows.map(record => serializeRecord(record, tableConfig.module_rows.headers)),
        tableConfig.module_rows.headers
      );
      changed = true;
    }
  }
  if (changed) XLSX.writeFile(workbook, dbPath);
};

const readWorkbook = () => {
  ensureWorkbook();
  return XLSX.readFile(dbPath, { cellDates: false });
};

const readTable = (tableName, workbook = readWorkbook()) => {
  const config = tableConfig[tableName];
  if (!config) return null;
  const sheet = workbook.Sheets[tableName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" }).map(record => normalizeTableRecord(tableName, record));
};

const readAllTables = () => {
  const workbook = readWorkbook();
  return Object.fromEntries(Object.keys(tableConfig).map(tableName => [tableName, readTable(tableName, workbook)]));
};

const writeTable = (tableName, rows) => {
  const config = tableConfig[tableName];
  if (!config || !Array.isArray(rows)) return false;
  const normalizedRows = tableName === "module_rows"
    ? HrmsModuleRowStore.dedupeModuleRows(HrmsDataBoundary.hrmsModuleRows(rows))
    : rows.map(record => normalizeTableRecord(tableName, record));
  const workbook = readWorkbook();
  workbook.Sheets[tableName] = worksheetFromRows(normalizedRows.map(record => serializeRecord(record, config.headers)), config.headers);
  if (!workbook.SheetNames.includes(tableName)) workbook.SheetNames.push(tableName);
  XLSX.writeFile(workbook, dbPath);
  return true;
};

const writeAllTables = data => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const workbook = readWorkbook();
  const prospectiveSnapshot = Object.fromEntries(Object.keys(tableConfig).map(tableName => [
    tableName,
    Array.isArray(data[tableName])
      ? data[tableName].map(record => normalizeTableRecord(tableName, record))
      : readTable(tableName, workbook) || []
  ]));
  const repairedSnapshot = HrmsDeleteIntegrity.repairRosterAttendanceLinks(prospectiveSnapshot).snapshot;
  const counts = {};
  for (const [tableName, config] of Object.entries(tableConfig)) {
    let rows = repairedSnapshot[tableName] || [];
    if (tableName === "module_rows") {
      rows = HrmsModuleRowStore.dedupeModuleRows(HrmsDataBoundary.hrmsModuleRows(rows));
    }
    workbook.Sheets[tableName] = worksheetFromRows(
      rows.map(record => serializeRecord(record, config.headers)),
      config.headers
    );
    if (!workbook.SheetNames.includes(tableName)) workbook.SheetNames.push(tableName);
    counts[tableName] = rows.length;
  }
  XLSX.writeFile(workbook, dbPath);
  return counts;
};

const migrateHrmsFinancialYearScope = async () => {
  if (!REQUIRE_ERP_CORE) return { ok: true, changed: false, skipped: true };
  const organization = await readErpOrganizationSnapshot();
  if (!organization) return { ok: false, changed: false, deferred: true };
  const current = readAllTables();
  const result = HrmsFinancialYearIntegrity.stampAndValidate(current, organization);
  if (!result.ok) return result;
  if (!result.changed) return result;
  const backupStamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(path.dirname(dbPath), `hrms_mock_database.pre-financial-year-scope-${backupStamp}.xlsx`);
  fs.copyFileSync(dbPath, backupPath);
  writeAllTables(result.snapshot);
  return { ...result, backup: backupPath };
};

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
  });
  response.end(JSON.stringify(payload));
};

const readBody = request => new Promise((resolve, reject) => {
  const chunks = [];
  request.on("data", chunk => chunks.push(chunk));
  request.on("end", () => {
    try {
      const text = Buffer.concat(chunks).toString("utf8");
      resolve(text ? JSON.parse(text) : null);
    } catch (error) {
      reject(error);
    }
  });
  request.on("error", reject);
});

const employeeUploadMimeExtensions = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf"
});
const safeUploadToken = value => String(value || "").trim().replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");

const saveEmployeeDocumentUpload = payload => {
  const employeeId = safeUploadToken(payload?.employee_id);
  const documentId = safeUploadToken(payload?.document_id);
  const mimeType = String(payload?.mime_type || "").trim().toLowerCase();
  const extension = employeeUploadMimeExtensions[mimeType];
  if (!employeeId || !documentId) throw new Error("Employee ID and document ID are required for upload.");
  if (!extension) throw new Error("Only JPG, PNG, WEBP and PDF employee documents are allowed.");
  const base64 = String(payload?.data_base64 || "").replace(/^data:[^;]+;base64,/, "");
  const file = Buffer.from(base64, "base64");
  if (!file.length) throw new Error("The selected employee document is empty.");
  if (file.length > 5 * 1024 * 1024) throw new Error("Employee documents must be 5 MB or smaller.");
  const employeeDir = path.join(employeeUploadDir, employeeId);
  fs.mkdirSync(employeeDir, { recursive: true });
  const storedName = `${documentId}${extension}`;
  const absolutePath = path.join(employeeDir, storedName);
  fs.writeFileSync(absolutePath, file);
  return {
    file_name: path.basename(String(payload?.file_name || storedName)),
    stored_path: path.relative(path.dirname(dbPath), absolutePath).replace(/\\/g, "/"),
    mime_type: mimeType,
    file_size_bytes: file.length
  };
};

ensureWorkbook();
const financialYearMigration = await migrateHrmsFinancialYearScope();
if (!financialYearMigration.ok) {
  console.warn(`HRMS Financial Year migration deferred: ${financialYearMigration.error || "ERP Core is unavailable."}`);
}

if (process.argv.includes("--init")) {
  console.log(`Mock Excel database ready: ${dbPath}`);
  process.exit(0);
}

http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `localhost:${PORT}`}`);
  if (request.method === "OPTIONS") return sendJson(response, 204, {});

  try {
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/hrms_dashboard_nav_visual.html")) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(fs.readFileSync(htmlPath, "utf8"));
      return;
    }

    if (request.method === "GET" && decodeURIComponent(url.pathname) === "/Indipet Logo White.png") {
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600"
      });
      response.end(fs.readFileSync(path.join(__dirname, "Indipet Logo White.png")));
      return;
    }

    if (request.method === "GET" && url.pathname === "/roster-persistence.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "roster-persistence.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/roster-optimizer.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "roster-optimizer.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/role-permission-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "role-permission-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/hrms-session-scope.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "hrms-session-scope.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/hrms-module-row-store.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "hrms-module-row-store.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/hrms-data-boundary.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "hrms-data-boundary.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/hrms-location-scope.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "hrms-location-scope.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/attendance-policy-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "attendance-policy-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/attendance-penalty-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "attendance-penalty-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/attendance-exception-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "attendance-exception-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/attendance-absence-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "attendance-absence-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/attendance-report-date.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "attendance-report-date.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/leave-ledger-co-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "leave-ledger-co-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/weekly-off-holiday-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "weekly-off-holiday-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/loss-of-pay-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "loss-of-pay-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/leave-cap-resolver.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "leave-cap-resolver.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/leave-policy-rule-validator.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "leave-policy-rule-validator.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/hrms-delete-integrity.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "hrms-delete-integrity.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/hrms-referential-integrity.cjs") {
      response.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      response.end(fs.readFileSync(path.join(__dirname, "hrms-referential-integrity.cjs"), "utf8"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        production: productionRuntime.production,
        workbook: dbPath,
        tables: Object.keys(tableConfig)
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/employee-document-upload") {
      const payload = await readBody(request);
      const saved = saveEmployeeDocumentUpload(payload);
      sendJson(response, 201, { ok: true, ...saved });
      return;
    }

    if (url.pathname === "/api/mock-db") {
      if (request.method === "GET") {
        const snapshot = readAllTables();
        sendJson(response, 200, { ...snapshot, _server_revision: workbookRevision() });
        return;
      }
      if (request.method === "PUT") {
        const expectedRevision = String(request.headers["if-match"] || "").trim();
        const currentRevision = workbookRevision();
        if (!expectedRevision) {
          return sendJson(response, 428, {
            error: "A current Excel database revision is required before saving. Reload and retry.",
            revision: currentRevision
          });
        }
        if (expectedRevision !== currentRevision) {
          return sendJson(response, 409, {
            error: "This HRMS snapshot is stale. Reload the latest Excel database before saving.",
            revision: currentRevision
          });
        }
        const data = await readBody(request);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return sendJson(response, 400, { error: "Expected a database snapshot object" });
        }
        const sharedFields = HrmsDataBoundary.sharedFieldsPresent(data);
        if (sharedFields.length) {
          return sendJson(response, 409, {
            error: `ERP Core owns ${sharedFields.join(", ")}; HRMS cannot write shared organization data.`
          });
        }
        if (Array.isArray(data.module_rows) && data.module_rows.some(HrmsDataBoundary.isRoleManagerRow)) {
          return sendJson(response, 409, {
            error: "ERP Core owns Role Master; HRMS module_rows accepts HRMS workflows only."
          });
        }
        const currentSnapshot = readAllTables();
        const prospectiveSnapshot = { ...currentSnapshot, ...data };
        const penaltyResult = HrmsAttendancePenaltyResolver.reconcile(prospectiveSnapshot);
        const penaltySnapshot = penaltyResult.snapshot;
        const lopResult = HrmsLossOfPayResolver.reconcileEntries(penaltySnapshot.leave_ledger, penaltySnapshot);
        let nextSnapshot = { ...penaltySnapshot, leave_ledger: lopResult.entries };
        const deletionValidation = HrmsDeleteIntegrity.validateSnapshotDeletion(currentSnapshot, nextSnapshot);
        if (!deletionValidation.ok) {
          return sendJson(response, 409, {
            error: deletionValidation.error,
            blockers: deletionValidation.blockers,
            table: deletionValidation.table,
            record_id: deletionValidation.recordId
          });
        }
        const erpDeleteValidation = await validateErpServiceDeleteDependencies(currentSnapshot, nextSnapshot);
        if (!erpDeleteValidation.ok) {
          return sendJson(response, erpDeleteValidation.unavailable ? 503 : 409, {
            error: erpDeleteValidation.error,
            blockers: erpDeleteValidation.blockers,
            table: erpDeleteValidation.table,
            record_id: erpDeleteValidation.recordId
          });
        }
        const referenceValidation = HrmsReferentialIntegrity.validateHrmsReferences(nextSnapshot);
        if (!referenceValidation.ok) {
          return sendJson(response, 409, {
            error: referenceValidation.error,
            blockers: referenceValidation.blockers,
            table: referenceValidation.table
          });
        }
        const leaveCodeValidation = HrmsLeavePolicyRuleValidator.validateUniqueLeaveCodes(nextSnapshot);
        if (!leaveCodeValidation.ok) {
          return sendJson(response, 409, {
            error: leaveCodeValidation.error,
            blockers: leaveCodeValidation.blockers,
            table: leaveCodeValidation.table
          });
        }
        const erpConnectivityValidation = await validateErpOrganizationConnectivity(nextSnapshot);
        if (!erpConnectivityValidation.ok) {
          return sendJson(response, erpConnectivityValidation.unavailable ? 503 : 409, {
            code: erpConnectivityValidation.code || "ERP_ORGANIZATION_REFERENCE_INVALID",
            error: erpConnectivityValidation.error,
            blockers: erpConnectivityValidation.blockers,
            table: erpConnectivityValidation.table
          });
        }
        nextSnapshot = erpConnectivityValidation.snapshot || nextSnapshot;
        const leaveCapValidation = HrmsLeaveCapResolver.validateApprovedLeaveCaps(nextSnapshot);
        if (!leaveCapValidation.ok) {
          return sendJson(response, 409, {
            error: leaveCapValidation.error,
            blockers: leaveCapValidation.blockers,
            table: leaveCapValidation.table
          });
        }
        const penaltyValidation = HrmsAttendancePenaltyResolver.validateSnapshot(nextSnapshot);
        if (!penaltyValidation.ok) {
          return sendJson(response, 409, {
            error: penaltyValidation.error,
            blockers: penaltyValidation.blockers,
            table: penaltyValidation.table
          });
        }
        const lopValidation = HrmsLossOfPayResolver.validateEntries(nextSnapshot);
        if (!lopValidation.ok) {
          return sendJson(response, 409, {
            error: lopValidation.error,
            blockers: lopValidation.blockers,
            table: lopValidation.table
          });
        }
        const counts = writeAllTables(nextSnapshot);
        sendJson(response, 200, { ok: true, counts, revision: workbookRevision() });
        return;
      }
    }

    const rosterDeleteMatch = url.pathname.match(/^\/api\/mock-db\/rosters\/([^/]+)$/);
    if (rosterDeleteMatch && request.method === "DELETE") {
      const rosterId = decodeURIComponent(rosterDeleteMatch[1]);
      const currentSnapshot = readAllTables();
      const currentRosters = Array.isArray(currentSnapshot.rosters) ? currentSnapshot.rosters : [];
      if (!currentRosters.some(record => String(record.roster_id || "") === rosterId)) {
        return sendJson(response, 404, { error: `Roster ${rosterId} was not found.` });
      }
      const nextRosters = currentRosters.filter(record => String(record.roster_id || "") !== rosterId);
      const nextSnapshot = { ...currentSnapshot, rosters: nextRosters };
      const deletionValidation = HrmsDeleteIntegrity.validateSnapshotDeletion(currentSnapshot, nextSnapshot);
      if (!deletionValidation.ok) {
        return sendJson(response, 409, {
          error: deletionValidation.error,
          blockers: deletionValidation.blockers,
          table: deletionValidation.table,
          record_id: deletionValidation.recordId
        });
      }
      const referenceValidation = HrmsReferentialIntegrity.validateHrmsReferences(nextSnapshot);
      if (!referenceValidation.ok) {
        return sendJson(response, 409, {
          error: referenceValidation.error,
          blockers: referenceValidation.blockers,
          table: referenceValidation.table
        });
      }
      const erpConnectivityValidation = await validateErpOrganizationConnectivity(nextSnapshot);
      if (!erpConnectivityValidation.ok) {
        return sendJson(response, erpConnectivityValidation.unavailable ? 503 : 409, {
          error: erpConnectivityValidation.error,
          blockers: erpConnectivityValidation.blockers,
          table: erpConnectivityValidation.table
        });
      }
      const leaveCapValidation = HrmsLeaveCapResolver.validateApprovedLeaveCaps(nextSnapshot);
      if (!leaveCapValidation.ok) {
        return sendJson(response, 409, {
          error: leaveCapValidation.error,
          blockers: leaveCapValidation.blockers,
          table: leaveCapValidation.table
        });
      }
      writeTable("rosters", nextRosters);
      sendJson(response, 200, {
        ok: true,
        table: "rosters",
        deleted_id: rosterId,
        count: nextRosters.length
      });
      return;
    }

    const tableMatch = url.pathname.match(/^\/api\/mock-db\/([a-z_]+)$/);
    if (tableMatch) {
      const tableName = tableMatch[1];
      if (!tableConfig[tableName]) return sendJson(response, 404, { error: "Unknown table" });
      if (request.method === "GET") return sendJson(response, 200, readTable(tableName));
      if (request.method === "PUT") {
        const rows = await readBody(request);
        if (!Array.isArray(rows)) return sendJson(response, 400, { error: "Expected an array of records" });
        let nextRows = rows.map(record => normalizeTableRecord(tableName, record));
        if (tableName === "module_rows" && nextRows.some(HrmsDataBoundary.isRoleManagerRow)) {
          return sendJson(response, 409, {
            error: "ERP Core owns Role Master; HRMS module_rows accepts HRMS workflows only."
          });
        }
        const currentSnapshot = readAllTables();
        const prospectiveSnapshot = { ...currentSnapshot, [tableName]: nextRows };
        const penaltyResult = HrmsAttendancePenaltyResolver.reconcile(prospectiveSnapshot);
        const penaltySnapshot = penaltyResult.snapshot;
        const lopResult = HrmsLossOfPayResolver.reconcileEntries(penaltySnapshot.leave_ledger, penaltySnapshot);
        let nextSnapshot = { ...penaltySnapshot, leave_ledger: lopResult.entries };
        const deletionValidation = HrmsDeleteIntegrity.validateSnapshotDeletion(currentSnapshot, nextSnapshot);
        if (!deletionValidation.ok) {
          return sendJson(response, 409, {
            error: deletionValidation.error,
            blockers: deletionValidation.blockers,
            table: deletionValidation.table,
            record_id: deletionValidation.recordId
          });
        }
        const erpDeleteValidation = await validateErpServiceDeleteDependencies(currentSnapshot, nextSnapshot);
        if (!erpDeleteValidation.ok) {
          return sendJson(response, erpDeleteValidation.unavailable ? 503 : 409, {
            error: erpDeleteValidation.error,
            blockers: erpDeleteValidation.blockers,
            table: erpDeleteValidation.table,
            record_id: erpDeleteValidation.recordId
          });
        }
        const referenceValidation = HrmsReferentialIntegrity.validateHrmsReferences(nextSnapshot);
        if (!referenceValidation.ok) {
          return sendJson(response, 409, {
            error: referenceValidation.error,
            blockers: referenceValidation.blockers,
            table: referenceValidation.table
          });
        }
        const leaveCodeValidation = HrmsLeavePolicyRuleValidator.validateUniqueLeaveCodes(nextSnapshot);
        if (!leaveCodeValidation.ok) {
          return sendJson(response, 409, {
            error: leaveCodeValidation.error,
            blockers: leaveCodeValidation.blockers,
            table: leaveCodeValidation.table
          });
        }
        const erpConnectivityValidation = await validateErpOrganizationConnectivity(nextSnapshot);
        if (!erpConnectivityValidation.ok) {
          return sendJson(response, erpConnectivityValidation.unavailable ? 503 : 409, {
            code: erpConnectivityValidation.code || "ERP_ORGANIZATION_REFERENCE_INVALID",
            error: erpConnectivityValidation.error,
            blockers: erpConnectivityValidation.blockers,
            table: erpConnectivityValidation.table
          });
        }
        nextSnapshot = erpConnectivityValidation.snapshot || nextSnapshot;
        const leaveCapValidation = HrmsLeaveCapResolver.validateApprovedLeaveCaps(nextSnapshot);
        if (!leaveCapValidation.ok) {
          return sendJson(response, 409, {
            error: leaveCapValidation.error,
            blockers: leaveCapValidation.blockers,
            table: leaveCapValidation.table
          });
        }
        const penaltyValidation = HrmsAttendancePenaltyResolver.validateSnapshot(nextSnapshot);
        if (!penaltyValidation.ok) {
          return sendJson(response, 409, {
            error: penaltyValidation.error,
            blockers: penaltyValidation.blockers,
            table: penaltyValidation.table
          });
        }
        const lopValidation = HrmsLossOfPayResolver.validateEntries(nextSnapshot);
        if (!lopValidation.ok) {
          return sendJson(response, 409, {
            error: lopValidation.error,
            blockers: lopValidation.blockers,
            table: lopValidation.table
          });
        }
        const counts = writeAllTables(nextSnapshot);
        sendJson(response, 200, { ok: true, table: tableName, count: counts[tableName], counts, revision: workbookRevision() });
        return;
      }
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}).listen(PORT, () => {
  console.log(`Indipet HRMS mock server running at http://localhost:${PORT}`);
  console.log(`Excel database: ${dbPath}`);
});
