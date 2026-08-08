const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "..", "database", "attendance_v2.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

const requiredTables = [
  "attendance_source",
  "attendance_policy",
  "attendance_policy_assignment",
  "attendance_event",
  "attendance_day",
  "attendance_measurement",
  "measurement_event",
  "computation_run",
  "attendance_computation",
  "attendance_decision",
  "regularization_request",
  "regularization_action",
  "shift_exception",
  "shift_exception_action",
  "co_ledger_entry",
  "report_definition"
];

const requiredViews = [
  "v_current_measurement",
  "v_current_computation",
  "v_current_decision",
  "v_daily_attendance",
  "v_regularization_status",
  "v_shift_exception_status",
  "v_co_balance",
  "v_payroll_input"
];

test("Attendance V2 is isolated from legacy public attendance storage", () => {
  assert.match(schema, /create schema if not exists hrms_attendance/i);
  assert.doesNotMatch(schema, /(?:alter|drop)\s+table\s+(?:if\s+exists\s+)?public\.attendance\b/i);
});

test("Attendance V2 contains every workflow table and projection", () => {
  for (const table of requiredTables) {
    assert.match(
      schema,
      new RegExp(`create table if not exists hrms_attendance\\.${table}\\b`, "i"),
      `missing table ${table}`
    );
  }
  for (const view of requiredViews) {
    assert.match(
      schema,
      new RegExp(`create or replace view hrms_attendance\\.${view}\\b`, "i"),
      `missing view ${view}`
    );
  }
});

test("Payroll consumes current approved decisions", () => {
  const payrollView = schema.match(
    /create or replace view hrms_attendance\.v_payroll_input[\s\S]*?;\s*\n\s*-- Supabase\/PostgREST JWT helpers/i
  );
  assert.ok(payrollView, "payroll view definition was not found");
  assert.match(payrollView[0], /join hrms_attendance\.v_current_decision/i);
  assert.match(payrollView[0], /decision\.decision_status = 'APPROVED'/i);
  assert.match(payrollView[0], /lifecycle_status in \('APPROVED', 'LOCKED'\)/i);
});

test("The current decision is resolved from an unbroken supersession chain", () => {
  assert.match(schema, /attendance_decision_supersedes_uq/i);
  assert.match(schema, /pg_advisory_xact_lock/i);
  assert.match(schema, /later_decision\.supersedes_decision_id = decision\.decision_id/i);
});

test("Tenant scope is explicit and fails closed", () => {
  assert.match(schema, /record_scope_allows/i);
  assert.match(schema, /attendance_data_scope', 'SELF'/i);
  assert.match(schema, /an empty location claim grants nothing/i);
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /force row level security/i);
});

test("Evidence and decision records are append-only", () => {
  assert.match(schema, /create or replace function hrms_attendance\.prevent_mutation/i);
  for (const table of [
    "attendance_event",
    "attendance_measurement",
    "attendance_computation",
    "attendance_decision",
    "co_ledger_entry"
  ]) {
    assert.match(schema, new RegExp(`'${table}'`, "i"), `missing immutable table ${table}`);
  }
});

test("Cross-record links are checked inside the database", () => {
  for (const validator of [
    "validate_day_references",
    "validate_computation_links",
    "validate_decision_links",
    "validate_exception_links",
    "validate_co_sources"
  ]) {
    assert.match(
      schema,
      new RegExp(`create or replace function hrms_attendance\\.${validator}\\b`, "i"),
      `missing relational validator ${validator}`
    );
  }
  assert.match(schema, /create or replace function hrms_attendance\.validate_policy_assignment\b/i);
});

test("Attendance Policy is entity-scoped and permission-protected", () => {
  assert.match(schema, /policy_code text not null unique/i);
  assert.match(schema, /status text not null default 'ACTIVE' check \(status in \('ACTIVE', 'INACTIVE'\)\)/i);
  assert.match(schema, /late_arrival_grace_minutes/i);
  assert.match(schema, /early_exit_grace_minutes/i);
  assert.match(schema, /assignment_mode text not null check \(assignment_mode in \('INCLUDE', 'EXCLUDE'\)\)/i);
  assert.match(schema, /HRMS_ATTENDANCE\.ATTENDANCE_POLICY\.VIEW/i);
  assert.match(schema, /HRMS_ATTENDANCE\.ATTENDANCE_POLICY\.CREATE/i);
  assert.match(schema, /HRMS_ATTENDANCE\.ATTENDANCE_POLICY\.EDIT/i);
  assert.match(schema, /HRMS_ATTENDANCE\.ATTENDANCE_POLICY\.DELETE/i);
});
