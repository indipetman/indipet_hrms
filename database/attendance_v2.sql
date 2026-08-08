-- Indipet HRMS Attendance V2
--
-- Additive PostgreSQL/Supabase schema. This deliberately does not alter or
-- drop the legacy public.attendance tables. Apply it only after the public
-- HRMS core tables referenced below have been created.

begin;

create extension if not exists pgcrypto;
create schema if not exists hrms_attendance;

comment on schema hrms_attendance is
  'Attendance V2: tenant-scoped capture, measurement, computation, decision, regularization, exception, CO, and payroll input records.';

create table if not exists hrms_attendance.schema_version (
  version integer primary key,
  migration_name text not null,
  applied_at timestamptz not null default now()
);

insert into hrms_attendance.schema_version (version, migration_name)
values (1, 'attendance_v2_initial')
on conflict (version) do nothing;

insert into hrms_attendance.schema_version (version, migration_name)
values (2, 'attendance_policy_configuration')
on conflict (version) do nothing;

create table if not exists hrms_attendance.attendance_source (
  source_id uuid primary key default gen_random_uuid(),
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  source_code text not null,
  source_name text not null,
  source_type text not null check (source_type in ('BIOMETRIC', 'MOBILE', 'WEB', 'IMPORT', 'API', 'MANUAL')),
  timezone_name text not null default 'Asia/Kolkata',
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, location_id, source_code)
);

create table if not exists hrms_attendance.attendance_policy (
  policy_id uuid primary key default gen_random_uuid(),
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  policy_code text not null unique,
  policy_name text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  version integer not null default 1 check (version > 0),
  rules jsonb not null default '{"late_arrival_grace_minutes":0,"early_exit_grace_minutes":0}'::jsonb
    check (jsonb_typeof(rules) = 'object'),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, policy_name)
);

create table if not exists hrms_attendance.attendance_policy_assignment (
  assignment_id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references hrms_attendance.attendance_policy(policy_id) on delete cascade,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  assignment_mode text not null check (assignment_mode in ('INCLUDE', 'EXCLUDE')),
  target_type text not null check (target_type in ('ENTITY', 'LOCATION', 'DEPARTMENT', 'DESIGNATION', 'SHIFT', 'EMPLOYEE')),
  target_key text not null,
  target_label text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (policy_id, assignment_mode, target_type, target_key)
);

create index if not exists attendance_policy_entity_status_idx
  on hrms_attendance.attendance_policy (entity_id, status);
create index if not exists attendance_policy_assignment_target_idx
  on hrms_attendance.attendance_policy_assignment (entity_id, target_type, target_key);

create or replace function hrms_attendance.validate_policy_assignment()
returns trigger
language plpgsql
as $$
declare
  policy_entity_id integer;
begin
  select entity_id into policy_entity_id
  from hrms_attendance.attendance_policy
  where policy_id = new.policy_id;
  if policy_entity_id is null then
    raise exception 'Attendance policy % does not exist', new.policy_id;
  end if;
  if policy_entity_id <> new.entity_id then
    raise exception 'Attendance policy assignment entity % does not match policy entity %', new.entity_id, policy_entity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_policy_assignment_validate on hrms_attendance.attendance_policy_assignment;
create trigger attendance_policy_assignment_validate
before insert or update on hrms_attendance.attendance_policy_assignment
for each row execute function hrms_attendance.validate_policy_assignment();

create table if not exists hrms_attendance.attendance_event (
  event_id uuid primary key default gen_random_uuid(),
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  source_id uuid references hrms_attendance.attendance_source(source_id) on delete restrict,
  source_event_key text,
  occurred_at timestamptz not null,
  event_type text not null check (event_type in (
    'CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END',
    'ACCESS_IN', 'ACCESS_OUT', 'MANUAL_IN', 'MANUAL_OUT'
  )),
  capture_method text not null check (capture_method in ('BIOMETRIC', 'FACE', 'MOBILE', 'WEB', 'IMPORT', 'API', 'MANUAL')),
  captured_by_employee_id integer references public.employee_master(employee_id) on delete restrict,
  raw_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_payload) = 'object'),
  received_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists attendance_event_source_key_uq
  on hrms_attendance.attendance_event (entity_id, source_id, source_event_key)
  where source_event_key is not null;
create index if not exists attendance_event_employee_time_idx
  on hrms_attendance.attendance_event (entity_id, employee_id, occurred_at);
create index if not exists attendance_event_location_time_idx
  on hrms_attendance.attendance_event (entity_id, location_id, occurred_at);

create table if not exists hrms_attendance.attendance_day (
  day_id uuid primary key default gen_random_uuid(),
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  work_date date not null,
  timezone_name text not null default 'Asia/Kolkata',
  roster_id integer references public.roster(roster_id) on delete restrict,
  roster_slot_id integer references public.roster_slots(slot_id) on delete restrict,
  shift_policy_id integer references public.shift_policy_master(policy_id) on delete restrict,
  holiday_id integer references public.holiday_calendar(holiday_id) on delete restrict,
  leave_request_id integer references public.leave_requests(request_id) on delete restrict,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  scheduled_day_type text not null default 'WORKING' check (scheduled_day_type in ('WORKING', 'WEEKLY_OFF', 'HOLIDAY', 'LEAVE')),
  lifecycle_status text not null default 'OPEN' check (lifecycle_status in ('OPEN', 'MEASURED', 'COMPUTED', 'PENDING_REVIEW', 'APPROVED', 'LOCKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, employee_id, work_date),
  check (scheduled_end_at is null or scheduled_start_at is null or scheduled_end_at > scheduled_start_at)
);

create index if not exists attendance_day_location_date_idx
  on hrms_attendance.attendance_day (entity_id, location_id, work_date);
create index if not exists attendance_day_payroll_idx
  on hrms_attendance.attendance_day (entity_id, employee_id, work_date, lifecycle_status);

create table if not exists hrms_attendance.attendance_measurement (
  measurement_id uuid primary key default gen_random_uuid(),
  day_id uuid not null references hrms_attendance.attendance_day(day_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  measurement_version integer not null check (measurement_version > 0),
  first_in_at timestamptz,
  last_out_at timestamptz,
  worked_minutes integer not null default 0 check (worked_minutes >= 0),
  unpaid_break_minutes integer not null default 0 check (unpaid_break_minutes >= 0),
  event_count integer not null default 0 check (event_count >= 0),
  has_missing_punch boolean not null default false,
  biometric_failure boolean not null default false,
  anomaly_codes text[] not null default '{}'::text[],
  measurement_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(measurement_payload) = 'object'),
  measured_at timestamptz not null default now(),
  measured_by text not null default 'SYSTEM',
  unique (day_id, measurement_version),
  check (last_out_at is null or first_in_at is null or last_out_at >= first_in_at)
);

create table if not exists hrms_attendance.measurement_event (
  measurement_id uuid not null references hrms_attendance.attendance_measurement(measurement_id) on delete restrict,
  event_id uuid not null references hrms_attendance.attendance_event(event_id) on delete restrict,
  event_order smallint not null check (event_order > 0),
  primary key (measurement_id, event_id),
  unique (measurement_id, event_order)
);

create table if not exists hrms_attendance.computation_run (
  run_id uuid primary key default gen_random_uuid(),
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer references public.sub_location(location_id) on delete restrict,
  period_start date not null,
  period_end date not null,
  ruleset_version text not null,
  run_status text not null default 'RUNNING' check (run_status in ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  requested_by uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_summary text,
  check (period_end >= period_start),
  check (completed_at is null or completed_at >= started_at)
);

create table if not exists hrms_attendance.attendance_computation (
  computation_id uuid primary key default gen_random_uuid(),
  run_id uuid not null references hrms_attendance.computation_run(run_id) on delete restrict,
  day_id uuid not null references hrms_attendance.attendance_day(day_id) on delete restrict,
  measurement_id uuid not null references hrms_attendance.attendance_measurement(measurement_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  ruleset_version text not null,
  scheduled_minutes integer not null default 0 check (scheduled_minutes >= 0),
  worked_minutes integer not null default 0 check (worked_minutes >= 0),
  late_minutes integer not null default 0 check (late_minutes >= 0),
  early_exit_minutes integer not null default 0 check (early_exit_minutes >= 0),
  overtime_minutes integer not null default 0 check (overtime_minutes >= 0),
  proposed_status text not null check (proposed_status in (
    'PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WEEKLY_OFF', 'HOLIDAY',
    'WORKED_WEEKLY_OFF', 'WORKED_HOLIDAY', 'INCOMPLETE', 'UNRESOLVED'
  )),
  proposed_payable_units numeric(5,2) not null default 0 check (proposed_payable_units between 0 and 2),
  proposed_co_units numeric(5,2) not null default 0 check (proposed_co_units between 0 and 2),
  requires_review boolean not null default false,
  rule_results jsonb not null default '{}'::jsonb check (jsonb_typeof(rule_results) = 'object'),
  computed_at timestamptz not null default now(),
  unique (run_id, day_id)
);

create index if not exists attendance_computation_day_idx
  on hrms_attendance.attendance_computation (day_id, computed_at desc);

create table if not exists hrms_attendance.attendance_decision (
  decision_id uuid primary key default gen_random_uuid(),
  day_id uuid not null references hrms_attendance.attendance_day(day_id) on delete restrict,
  computation_id uuid references hrms_attendance.attendance_computation(computation_id) on delete restrict,
  supersedes_decision_id uuid references hrms_attendance.attendance_decision(decision_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  decision_status text not null check (decision_status in ('APPROVED', 'REJECTED')),
  final_status text check (final_status in (
    'PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'LEAVE', 'WEEKLY_OFF', 'HOLIDAY',
    'WORKED_WEEKLY_OFF', 'WORKED_HOLIDAY', 'INCOMPLETE', 'UNRESOLVED'
  )),
  payable_units numeric(5,2) not null default 0 check (payable_units between 0 and 2),
  co_units numeric(5,2) not null default 0 check (co_units between 0 and 2),
  decision_reason text,
  decided_by_employee_id integer references public.employee_master(employee_id) on delete restrict,
  decided_by uuid,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (
    (decision_status = 'APPROVED' and final_status is not null)
    or (decision_status = 'REJECTED' and final_status is null and payable_units = 0 and co_units = 0)
  )
);

create index if not exists attendance_decision_current_idx
  on hrms_attendance.attendance_decision (day_id, decided_at desc, decision_id desc);
create unique index if not exists attendance_decision_supersedes_uq
  on hrms_attendance.attendance_decision (supersedes_decision_id)
  where supersedes_decision_id is not null;

create table if not exists hrms_attendance.regularization_request (
  request_id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  day_id uuid not null references hrms_attendance.attendance_day(day_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  issue_type text not null check (issue_type in ('MISSING_IN', 'MISSING_OUT', 'WRONG_TIME', 'WRONG_STATUS', 'ROSTER_MISMATCH', 'BIOMETRIC_FAILURE', 'OTHER')),
  requested_in_at timestamptz,
  requested_out_at timestamptz,
  requested_status text,
  requested_payable_units numeric(5,2) check (requested_payable_units between 0 and 2),
  reason text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  submitted_by_employee_id integer references public.employee_master(employee_id) on delete restrict,
  submitted_by uuid,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (requested_out_at is null or requested_in_at is null or requested_out_at >= requested_in_at)
);

create index if not exists regularization_employee_date_idx
  on hrms_attendance.regularization_request (entity_id, employee_id, submitted_at desc);

create table if not exists hrms_attendance.regularization_action (
  action_id uuid primary key default gen_random_uuid(),
  request_id uuid not null references hrms_attendance.regularization_request(request_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  action_type text not null check (action_type in ('SUBMITTED', 'INFO_REQUESTED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  action_note text,
  actor_employee_id integer references public.employee_master(employee_id) on delete restrict,
  actor_user_id uuid,
  action_at timestamptz not null default now()
);

create index if not exists regularization_action_request_idx
  on hrms_attendance.regularization_action (request_id, action_at desc);

create table if not exists hrms_attendance.shift_exception (
  exception_id uuid primary key default gen_random_uuid(),
  exception_number text not null unique,
  day_id uuid not null references hrms_attendance.attendance_day(day_id) on delete restrict,
  computation_id uuid references hrms_attendance.attendance_computation(computation_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  exception_type text not null check (exception_type in ('LATE', 'EARLY_EXIT', 'MISSING_PUNCH', 'ROSTER_MISMATCH', 'EXCESS_HOURS', 'BIOMETRIC_FAILURE', 'OTHER')),
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  exception_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(exception_payload) = 'object'),
  detected_at timestamptz not null default now(),
  detected_by text not null default 'SYSTEM'
);

create table if not exists hrms_attendance.shift_exception_action (
  action_id uuid primary key default gen_random_uuid(),
  exception_id uuid not null references hrms_attendance.shift_exception(exception_id) on delete restrict,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  action_type text not null check (action_type in ('DETECTED', 'ACKNOWLEDGED', 'RESOLVED', 'REOPENED', 'WAIVED')),
  action_note text,
  actor_employee_id integer references public.employee_master(employee_id) on delete restrict,
  actor_user_id uuid,
  action_at timestamptz not null default now()
);

create table if not exists hrms_attendance.co_ledger_entry (
  entry_id uuid primary key default gen_random_uuid(),
  entry_key text not null,
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer not null references public.sub_location(location_id) on delete restrict,
  employee_id integer not null references public.employee_master(employee_id) on delete restrict,
  day_id uuid references hrms_attendance.attendance_day(day_id) on delete restrict,
  source_decision_id uuid references hrms_attendance.attendance_decision(decision_id) on delete restrict,
  source_regularization_request_id uuid references hrms_attendance.regularization_request(request_id) on delete restrict,
  reverses_entry_id uuid references hrms_attendance.co_ledger_entry(entry_id) on delete restrict,
  entry_type text not null check (entry_type in ('EARN', 'USE', 'EXPIRE', 'ADJUST', 'REVERSAL')),
  units numeric(5,2) not null check (units <> 0),
  effective_date date not null,
  expires_on date,
  note text,
  created_by_employee_id integer references public.employee_master(employee_id) on delete restrict,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (entity_id, entry_key),
  check (expires_on is null or expires_on >= effective_date),
  check ((entry_type = 'EARN') = (source_decision_id is not null)),
  check ((entry_type = 'REVERSAL') = (reverses_entry_id is not null)),
  check (
    (entry_type = 'EARN' and units > 0)
    or (entry_type in ('USE', 'EXPIRE') and units < 0)
    or entry_type in ('ADJUST', 'REVERSAL')
  )
);

create unique index if not exists co_ledger_decision_earn_uq
  on hrms_attendance.co_ledger_entry (source_decision_id)
  where entry_type = 'EARN' and source_decision_id is not null;
create unique index if not exists co_ledger_reversal_uq
  on hrms_attendance.co_ledger_entry (reverses_entry_id)
  where reverses_entry_id is not null;
create index if not exists co_ledger_balance_idx
  on hrms_attendance.co_ledger_entry (entity_id, employee_id, effective_date);

create table if not exists hrms_attendance.report_definition (
  report_id uuid primary key default gen_random_uuid(),
  entity_id integer not null references public.parent_entity(entity_id) on delete restrict,
  location_id integer references public.sub_location(location_id) on delete restrict,
  report_name text not null,
  report_type text not null check (report_type in ('DAILY', 'EMPLOYEE', 'LOCATION', 'EXCEPTION', 'REGULARIZATION', 'CO', 'PAYROLL_INPUT')),
  filters jsonb not null default '{}'::jsonb check (jsonb_typeof(filters) = 'object'),
  schedule jsonb not null default '{}'::jsonb check (jsonb_typeof(schedule) = 'object'),
  owner_employee_id integer references public.employee_master(employee_id) on delete restrict,
  owner_user_id uuid,
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, report_name)
);

-- Enforce the tenant relationship carried by every operational record. An
-- employee may have moved locations, so historical records validate the
-- employee's entity but retain the historical attendance location.
create or replace function hrms_attendance.validate_scope_context()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  row_data jsonb := to_jsonb(new);
  record_entity_id integer := nullif(row_data ->> 'entity_id', '')::integer;
  record_location_id integer := nullif(row_data ->> 'location_id', '')::integer;
  record_employee_id integer := nullif(row_data ->> 'employee_id', '')::integer;
begin
  if record_entity_id is null or not exists (
    select 1 from public.parent_entity where entity_id = record_entity_id
  ) then
    raise exception 'Unknown attendance entity_id: %', record_entity_id;
  end if;

  if record_location_id is not null and not exists (
    select 1
    from public.sub_location
    where location_id = record_location_id
      and parent_entity_id = record_entity_id
  ) then
    raise exception 'Location % does not belong to entity %', record_location_id, record_entity_id;
  end if;

  if record_employee_id is not null and not exists (
    select 1
    from public.employee_master
    where employee_id = record_employee_id
      and parent_entity_id = record_entity_id
  ) then
    raise exception 'Employee % does not belong to entity %', record_employee_id, record_entity_id;
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_day_context()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  row_data jsonb := to_jsonb(new);
  record_day_id uuid := nullif(row_data ->> 'day_id', '')::uuid;
  parent_day hrms_attendance.attendance_day%rowtype;
begin
  if record_day_id is null then
    return new;
  end if;

  select * into parent_day
  from hrms_attendance.attendance_day
  where day_id = record_day_id;

  if not found then
    raise exception 'Unknown attendance day_id: %', record_day_id;
  end if;

  if parent_day.entity_id <> nullif(row_data ->> 'entity_id', '')::integer
     or parent_day.location_id <> nullif(row_data ->> 'location_id', '')::integer
     or parent_day.employee_id <> nullif(row_data ->> 'employee_id', '')::integer then
    raise exception 'Attendance child context does not match day %', record_day_id;
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_day_references()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  roster_row public.roster%rowtype;
  slot_row public.roster_slots%rowtype;
  shift_row public.shift_policy_master%rowtype;
  holiday_row public.holiday_calendar%rowtype;
  leave_row public.leave_requests%rowtype;
begin
  if new.roster_id is not null then
    select * into roster_row from public.roster where roster_id = new.roster_id;
    if roster_row.location_id <> new.location_id or roster_row.roster_date <> new.work_date then
      raise exception 'Roster % does not match attendance day location/date', new.roster_id;
    end if;
  end if;

  if new.roster_slot_id is not null then
    select * into slot_row from public.roster_slots where slot_id = new.roster_slot_id;
    if new.roster_id is null
       or slot_row.roster_id <> new.roster_id
       or slot_row.employee_id <> new.employee_id then
      raise exception 'Roster slot % does not match attendance day roster/employee', new.roster_slot_id;
    end if;
  end if;

  if new.shift_policy_id is not null then
    select * into shift_row from public.shift_policy_master where policy_id = new.shift_policy_id;
    if shift_row.location_id is not null and shift_row.location_id <> new.location_id then
      raise exception 'Shift policy % does not belong to attendance location %', new.shift_policy_id, new.location_id;
    end if;
  end if;

  if new.holiday_id is not null then
    select * into holiday_row from public.holiday_calendar where holiday_id = new.holiday_id;
    if holiday_row.holiday_date <> new.work_date
       or (holiday_row.location_id is not null and holiday_row.location_id <> new.location_id) then
      raise exception 'Holiday % does not match attendance day location/date', new.holiday_id;
    end if;
  end if;

  if new.leave_request_id is not null then
    select * into leave_row from public.leave_requests where request_id = new.leave_request_id;
    if leave_row.employee_id <> new.employee_id
       or new.work_date < leave_row.start_date
       or new.work_date > leave_row.end_date then
      raise exception 'Leave request % does not cover attendance employee/date', new.leave_request_id;
    end if;
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_computation_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  measurement_row hrms_attendance.attendance_measurement%rowtype;
  run_row hrms_attendance.computation_run%rowtype;
begin
  select * into measurement_row
  from hrms_attendance.attendance_measurement
  where measurement_id = new.measurement_id;
  select * into run_row
  from hrms_attendance.computation_run
  where run_id = new.run_id;

  if measurement_row.day_id <> new.day_id
     or measurement_row.entity_id <> new.entity_id
     or measurement_row.location_id <> new.location_id
     or measurement_row.employee_id <> new.employee_id then
    raise exception 'Computation measurement context does not match its attendance day';
  end if;

  if run_row.entity_id <> new.entity_id
     or (run_row.location_id is not null and run_row.location_id <> new.location_id) then
    raise exception 'Computation run context does not match the attendance record';
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_decision_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  computation_row hrms_attendance.attendance_computation%rowtype;
  previous_row hrms_attendance.attendance_decision%rowtype;
  current_row hrms_attendance.attendance_decision%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.day_id::text, 0));

  if new.supersedes_decision_id = new.decision_id then
    raise exception 'A decision cannot supersede itself';
  end if;

  select decision.* into current_row
  from hrms_attendance.attendance_decision decision
  where decision.day_id = new.day_id
    and not exists (
      select 1
      from hrms_attendance.attendance_decision later_decision
      where later_decision.supersedes_decision_id = decision.decision_id
    )
  order by decision.created_at desc, decision.decision_id desc
  limit 1;

  if found and new.supersedes_decision_id is distinct from current_row.decision_id then
    raise exception 'A new decision must supersede the current decision %', current_row.decision_id;
  elsif not found and new.supersedes_decision_id is not null then
    raise exception 'The first decision for an attendance day cannot supersede another decision';
  end if;

  if new.computation_id is not null then
    select * into computation_row
    from hrms_attendance.attendance_computation
    where computation_id = new.computation_id;
    if computation_row.day_id <> new.day_id
       or computation_row.entity_id <> new.entity_id
       or computation_row.location_id <> new.location_id
       or computation_row.employee_id <> new.employee_id then
      raise exception 'Decision computation context does not match its attendance day';
    end if;
  end if;

  if new.supersedes_decision_id is not null then
    select * into previous_row
    from hrms_attendance.attendance_decision
    where decision_id = new.supersedes_decision_id;
    if previous_row.day_id <> new.day_id
       or previous_row.entity_id <> new.entity_id
       or previous_row.location_id <> new.location_id
       or previous_row.employee_id <> new.employee_id then
      raise exception 'A decision may supersede only a decision for the same attendance day';
    end if;
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_exception_links()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  computation_row hrms_attendance.attendance_computation%rowtype;
begin
  if new.computation_id is null then
    return new;
  end if;

  select * into computation_row
  from hrms_attendance.attendance_computation
  where computation_id = new.computation_id;
  if computation_row.day_id <> new.day_id
     or computation_row.entity_id <> new.entity_id
     or computation_row.location_id <> new.location_id
     or computation_row.employee_id <> new.employee_id then
    raise exception 'Exception computation context does not match its attendance day';
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_co_sources()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  decision_row hrms_attendance.attendance_decision%rowtype;
  request_row hrms_attendance.regularization_request%rowtype;
  reversed_row hrms_attendance.co_ledger_entry%rowtype;
begin
  if new.reverses_entry_id = new.entry_id then
    raise exception 'A CO ledger entry cannot reverse itself';
  end if;

  if new.source_decision_id is not null then
    select * into decision_row
    from hrms_attendance.attendance_decision
    where decision_id = new.source_decision_id;
    if decision_row.entity_id <> new.entity_id
       or decision_row.location_id <> new.location_id
       or decision_row.employee_id <> new.employee_id
       or (new.day_id is not null and decision_row.day_id <> new.day_id)
       or decision_row.decision_status <> 'APPROVED'
       or decision_row.co_units <> new.units then
      raise exception 'CO source decision context does not match its ledger entry';
    end if;
  end if;

  if new.source_regularization_request_id is not null then
    select * into request_row
    from hrms_attendance.regularization_request
    where request_id = new.source_regularization_request_id;
    if request_row.entity_id <> new.entity_id
       or request_row.location_id <> new.location_id
       or request_row.employee_id <> new.employee_id
       or (new.day_id is not null and request_row.day_id <> new.day_id) then
      raise exception 'CO regularization context does not match its ledger entry';
    end if;
  end if;

  if new.reverses_entry_id is not null then
    select * into reversed_row
    from hrms_attendance.co_ledger_entry
    where entry_id = new.reverses_entry_id;
    if reversed_row.entity_id <> new.entity_id
       or reversed_row.employee_id <> new.employee_id
       or new.units <> -reversed_row.units then
      raise exception 'A CO entry may reverse only an entry for the same employee/entity';
    end if;
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_measurement_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  measurement_row hrms_attendance.attendance_measurement%rowtype;
  event_row hrms_attendance.attendance_event%rowtype;
begin
  select * into measurement_row from hrms_attendance.attendance_measurement where measurement_id = new.measurement_id;
  select * into event_row from hrms_attendance.attendance_event where event_id = new.event_id;

  if measurement_row.entity_id <> event_row.entity_id
     or measurement_row.location_id <> event_row.location_id
     or measurement_row.employee_id <> event_row.employee_id then
    raise exception 'Measurement and event tenant context must match';
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_request_action()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  request_row hrms_attendance.regularization_request%rowtype;
begin
  select * into request_row
  from hrms_attendance.regularization_request
  where request_id = new.request_id;

  if request_row.entity_id <> new.entity_id
     or request_row.location_id <> new.location_id
     or request_row.employee_id <> new.employee_id then
    raise exception 'Regularization action context must match its request';
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.validate_exception_action()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, hrms_attendance
as $$
declare
  exception_row hrms_attendance.shift_exception%rowtype;
begin
  select * into exception_row
  from hrms_attendance.shift_exception
  where exception_id = new.exception_id;

  if exception_row.entity_id <> new.entity_id
     or exception_row.location_id <> new.location_id
     or exception_row.employee_id <> new.employee_id then
    raise exception 'Exception action context must match its exception';
  end if;

  return new;
end;
$$;

create or replace function hrms_attendance.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function hrms_attendance.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only; add a correcting or superseding record instead', tg_table_name;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'attendance_source', 'attendance_policy', 'attendance_policy_assignment',
    'attendance_event', 'attendance_day', 'attendance_measurement',
    'computation_run', 'attendance_computation', 'attendance_decision',
    'regularization_request', 'regularization_action', 'shift_exception',
    'shift_exception_action', 'co_ledger_entry', 'report_definition'
  ] loop
    execute format('drop trigger if exists validate_scope_context on hrms_attendance.%I', table_name);
    execute format(
      'create trigger validate_scope_context before insert or update on hrms_attendance.%I for each row execute function hrms_attendance.validate_scope_context()',
      table_name
    );
  end loop;
end;
$$;

drop trigger if exists validate_day_references on hrms_attendance.attendance_day;
create trigger validate_day_references
before insert or update on hrms_attendance.attendance_day
for each row execute function hrms_attendance.validate_day_references();

drop trigger if exists validate_computation_links on hrms_attendance.attendance_computation;
create trigger validate_computation_links
before insert or update on hrms_attendance.attendance_computation
for each row execute function hrms_attendance.validate_computation_links();

drop trigger if exists validate_decision_links on hrms_attendance.attendance_decision;
create trigger validate_decision_links
before insert or update on hrms_attendance.attendance_decision
for each row execute function hrms_attendance.validate_decision_links();

drop trigger if exists validate_exception_links on hrms_attendance.shift_exception;
create trigger validate_exception_links
before insert or update on hrms_attendance.shift_exception
for each row execute function hrms_attendance.validate_exception_links();

drop trigger if exists validate_co_sources on hrms_attendance.co_ledger_entry;
create trigger validate_co_sources
before insert or update on hrms_attendance.co_ledger_entry
for each row execute function hrms_attendance.validate_co_sources();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'attendance_measurement', 'attendance_computation', 'attendance_decision',
    'regularization_request', 'shift_exception', 'co_ledger_entry'
  ] loop
    execute format('drop trigger if exists validate_day_context on hrms_attendance.%I', table_name);
    execute format(
      'create trigger validate_day_context before insert or update on hrms_attendance.%I for each row execute function hrms_attendance.validate_day_context()',
      table_name
    );
  end loop;
end;
$$;

drop trigger if exists validate_measurement_event on hrms_attendance.measurement_event;
create trigger validate_measurement_event
before insert or update on hrms_attendance.measurement_event
for each row execute function hrms_attendance.validate_measurement_event();

drop trigger if exists validate_request_action on hrms_attendance.regularization_action;
create trigger validate_request_action
before insert or update on hrms_attendance.regularization_action
for each row execute function hrms_attendance.validate_request_action();

drop trigger if exists validate_exception_action on hrms_attendance.shift_exception_action;
create trigger validate_exception_action
before insert or update on hrms_attendance.shift_exception_action
for each row execute function hrms_attendance.validate_exception_action();

drop trigger if exists attendance_source_updated_at on hrms_attendance.attendance_source;
create trigger attendance_source_updated_at
before update on hrms_attendance.attendance_source
for each row execute function hrms_attendance.set_updated_at();

drop trigger if exists attendance_day_updated_at on hrms_attendance.attendance_day;
create trigger attendance_day_updated_at
before update on hrms_attendance.attendance_day
for each row execute function hrms_attendance.set_updated_at();

drop trigger if exists report_definition_updated_at on hrms_attendance.report_definition;
create trigger report_definition_updated_at
before update on hrms_attendance.report_definition
for each row execute function hrms_attendance.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'attendance_event', 'attendance_measurement', 'measurement_event',
    'attendance_computation', 'attendance_decision', 'regularization_request',
    'regularization_action', 'shift_exception', 'shift_exception_action', 'co_ledger_entry'
  ] loop
    execute format('drop trigger if exists prevent_mutation on hrms_attendance.%I', table_name);
    execute format(
      'create trigger prevent_mutation before update or delete on hrms_attendance.%I for each row execute function hrms_attendance.prevent_mutation()',
      table_name
    );
  end loop;
end;
$$;

create or replace view hrms_attendance.v_current_measurement
with (security_invoker = true)
as
select distinct on (day_id) *
from hrms_attendance.attendance_measurement
order by day_id, measurement_version desc, measured_at desc, measurement_id desc;

create or replace view hrms_attendance.v_current_computation
with (security_invoker = true)
as
select distinct on (day_id) *
from hrms_attendance.attendance_computation
order by day_id, computed_at desc, computation_id desc;

create or replace view hrms_attendance.v_current_decision
with (security_invoker = true)
as
select decision.*
from hrms_attendance.attendance_decision decision
where not exists (
  select 1
  from hrms_attendance.attendance_decision later_decision
  where later_decision.supersedes_decision_id = decision.decision_id
);

create or replace view hrms_attendance.v_daily_attendance
with (security_invoker = true)
as
select
  day_record.day_id,
  day_record.entity_id,
  day_record.location_id,
  day_record.employee_id,
  day_record.work_date,
  day_record.roster_id,
  day_record.roster_slot_id,
  day_record.shift_policy_id,
  day_record.scheduled_day_type,
  day_record.lifecycle_status,
  measurement.measurement_id,
  measurement.first_in_at,
  measurement.last_out_at,
  measurement.worked_minutes,
  measurement.has_missing_punch,
  computation.computation_id,
  computation.proposed_status,
  computation.proposed_payable_units,
  computation.requires_review,
  decision.decision_id,
  decision.decision_status,
  decision.final_status,
  decision.payable_units,
  decision.co_units,
  decision.decided_at
from hrms_attendance.attendance_day day_record
left join hrms_attendance.v_current_measurement measurement using (day_id)
left join hrms_attendance.v_current_computation computation using (day_id)
left join hrms_attendance.v_current_decision decision using (day_id);

create or replace view hrms_attendance.v_regularization_status
with (security_invoker = true)
as
select
  request.*,
  coalesce(latest.action_type, 'SUBMITTED') as current_status,
  latest.action_note as latest_action_note,
  latest.actor_employee_id as latest_actor_employee_id,
  latest.action_at as latest_action_at
from hrms_attendance.regularization_request request
left join lateral (
  select action_type, action_note, actor_employee_id, action_at
  from hrms_attendance.regularization_action action
  where action.request_id = request.request_id
  order by action_at desc, action_id desc
  limit 1
) latest on true;

create or replace view hrms_attendance.v_shift_exception_status
with (security_invoker = true)
as
select
  exception.*,
  coalesce(latest.action_type, 'DETECTED') as current_status,
  latest.action_note as latest_action_note,
  latest.actor_employee_id as latest_actor_employee_id,
  latest.action_at as latest_action_at
from hrms_attendance.shift_exception exception
left join lateral (
  select action_type, action_note, actor_employee_id, action_at
  from hrms_attendance.shift_exception_action action
  where action.exception_id = exception.exception_id
  order by action_at desc, action_id desc
  limit 1
) latest on true;

create or replace view hrms_attendance.v_co_balance
with (security_invoker = true)
as
select
  entity_id,
  employee_id,
  sum(units) filter (where effective_date <= current_date) as available_units,
  min(expires_on) filter (where entry_type = 'EARN' and expires_on >= current_date) as next_expiry_date,
  max(effective_date) as last_entry_date
from hrms_attendance.co_ledger_entry
group by entity_id, employee_id;

comment on view hrms_attendance.v_co_balance is
  'Ledger balance. The expiry process must append an EXPIRE entry; balances are never stored as a mutable integer.';

create or replace view hrms_attendance.v_payroll_input
with (security_invoker = true)
as
select
  day_record.day_id,
  day_record.entity_id,
  day_record.location_id,
  day_record.employee_id,
  day_record.work_date,
  decision.final_status,
  decision.payable_units,
  computation.worked_minutes,
  computation.late_minutes,
  computation.early_exit_minutes,
  computation.overtime_minutes,
  decision.decision_id,
  decision.decided_at
from hrms_attendance.attendance_day day_record
join hrms_attendance.v_current_decision decision using (day_id)
left join hrms_attendance.v_current_computation computation using (day_id)
where decision.decision_status = 'APPROVED'
  and day_record.lifecycle_status in ('APPROVED', 'LOCKED');

-- Supabase/PostgREST JWT helpers. Scope and action permission are deliberately
-- independent: a role can perform an action only inside its assigned data scope.
create or replace function hrms_attendance.jwt_claims()
returns jsonb
language plpgsql
stable
as $$
declare
  raw_claims text := current_setting('request.jwt.claims', true);
begin
  if raw_claims is null or btrim(raw_claims) = '' then
    return '{}'::jsonb;
  end if;
  begin
    return raw_claims::jsonb;
  exception when others then
    return '{}'::jsonb;
  end;
end;
$$;

create or replace function hrms_attendance.claim_values(claim_name text)
returns text[]
language plpgsql
stable
as $$
declare
  claim jsonb := hrms_attendance.jwt_claims() -> claim_name;
  scalar_value text;
  result text[];
begin
  if claim is null then
    return array[]::text[];
  end if;

  if jsonb_typeof(claim) = 'array' then
    select coalesce(array_agg(upper(btrim(value))), array[]::text[])
    into result
    from jsonb_array_elements_text(claim) item(value)
    where btrim(value) <> '';
    return result;
  end if;

  scalar_value := trim(both '"' from claim::text);
  select coalesce(array_agg(upper(btrim(value))), array[]::text[])
  into result
  from regexp_split_to_table(scalar_value, '[,;|]') item(value)
  where btrim(value) <> '';
  return result;
end;
$$;

create or replace function hrms_attendance.is_system_admin()
returns boolean
language sql
stable
as $$
  select
    lower(coalesce(hrms_attendance.jwt_claims() ->> 'is_system_admin', 'false')) = 'true'
    or upper(coalesce(hrms_attendance.jwt_claims() ->> 'role_id', '')) in ('ADM0001', 'SYSTEM_ADMIN', 'ADMIN')
    or upper(coalesce(hrms_attendance.jwt_claims() ->> 'role_code', '')) in ('ADM0001', 'SYSTEM_ADMIN', 'ADMIN');
$$;

create or replace function hrms_attendance.has_permission(permission_code text)
returns boolean
language sql
stable
as $$
  select hrms_attendance.is_system_admin()
    or '*' = any(hrms_attendance.claim_values('permission_codes'))
    or upper(permission_code) = any(hrms_attendance.claim_values('permission_codes'));
$$;

create or replace function hrms_attendance.scope_allows(record_entity_id integer, record_location_id integer default null)
returns boolean
language plpgsql
stable
as $$
declare
  entity_scope text[] := hrms_attendance.claim_values('access_entity_ids') || hrms_attendance.claim_values('access_entity_id');
  location_scope text[] := hrms_attendance.claim_values('access_location_ids') || hrms_attendance.claim_values('access_location_id');
  session_entity text := upper(coalesce(hrms_attendance.jwt_claims() ->> 'entity_id', ''));
  entity_allowed boolean;
begin
  if hrms_attendance.is_system_admin() then
    return true;
  end if;

  entity_allowed := 'ALL_ENTITIES' = any(entity_scope)
    or record_entity_id::text = any(entity_scope)
    or record_entity_id::text = session_entity;

  if not entity_allowed then
    return false;
  end if;

  if record_location_id is null then
    return true;
  end if;

  -- Fail closed: an empty location claim grants nothing. Use ALL_MAPPED
  -- explicitly for entity-wide franchisee access.
  return 'ALL_MAPPED' = any(location_scope)
    or 'ALL_LOCATIONS' = any(location_scope)
    or record_location_id::text = any(location_scope);
end;
$$;

create or replace function hrms_attendance.employee_is_self(record_employee_id integer)
returns boolean
language sql
stable
as $$
  select record_employee_id::text = any(hrms_attendance.claim_values('employee_id'));
$$;

create or replace function hrms_attendance.record_scope_allows(
  record_entity_id integer,
  record_location_id integer,
  record_employee_id integer
)
returns boolean
language plpgsql
stable
as $$
declare
  data_scope text := upper(coalesce(hrms_attendance.jwt_claims() ->> 'attendance_data_scope', 'SELF'));
begin
  if hrms_attendance.is_system_admin() then
    return true;
  end if;
  if not hrms_attendance.scope_allows(record_entity_id, record_location_id) then
    return false;
  end if;
  if data_scope = 'SELF' then
    return hrms_attendance.employee_is_self(record_employee_id);
  end if;
  if data_scope in ('LOCATIONS', 'ENTITY') then
    return true;
  end if;
  return false;
end;
$$;

-- RLS is the production boundary. Browser filtering remains useful for UX,
-- but it must never be the authority for attendance access.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'attendance_source', 'attendance_event', 'attendance_day', 'attendance_measurement',
    'measurement_event', 'computation_run', 'attendance_computation', 'attendance_decision',
    'regularization_request', 'regularization_action', 'shift_exception',
    'shift_exception_action', 'co_ledger_entry', 'report_definition'
  ] loop
    execute format('alter table hrms_attendance.%I enable row level security', table_name);
    execute format('alter table hrms_attendance.%I force row level security', table_name);
  end loop;
end;
$$;

drop policy if exists attendance_source_read on hrms_attendance.attendance_source;
create policy attendance_source_read on hrms_attendance.attendance_source
for select using (
  hrms_attendance.scope_allows(entity_id, location_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);

drop policy if exists attendance_policy_read on hrms_attendance.attendance_policy;
create policy attendance_policy_read on hrms_attendance.attendance_policy
for select using (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.VIEW')
);
drop policy if exists attendance_policy_create on hrms_attendance.attendance_policy;
create policy attendance_policy_create on hrms_attendance.attendance_policy
for insert with check (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.CREATE')
);
drop policy if exists attendance_policy_edit on hrms_attendance.attendance_policy;
create policy attendance_policy_edit on hrms_attendance.attendance_policy
for update
using (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.EDIT')
)
with check (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.EDIT')
);
drop policy if exists attendance_policy_delete on hrms_attendance.attendance_policy;
create policy attendance_policy_delete on hrms_attendance.attendance_policy
for delete using (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.DELETE')
);

drop policy if exists attendance_policy_assignment_read on hrms_attendance.attendance_policy_assignment;
create policy attendance_policy_assignment_read on hrms_attendance.attendance_policy_assignment
for select using (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.VIEW')
);
drop policy if exists attendance_policy_assignment_create on hrms_attendance.attendance_policy_assignment;
create policy attendance_policy_assignment_create on hrms_attendance.attendance_policy_assignment
for insert with check (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.CREATE')
);
drop policy if exists attendance_policy_assignment_edit on hrms_attendance.attendance_policy_assignment;
create policy attendance_policy_assignment_edit on hrms_attendance.attendance_policy_assignment
for update
using (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.EDIT')
)
with check (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.EDIT')
);
drop policy if exists attendance_policy_assignment_delete on hrms_attendance.attendance_policy_assignment;
create policy attendance_policy_assignment_delete on hrms_attendance.attendance_policy_assignment
for delete using (
  hrms_attendance.scope_allows(entity_id, null)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_POLICY.DELETE')
);

drop policy if exists attendance_event_read on hrms_attendance.attendance_event;
create policy attendance_event_read on hrms_attendance.attendance_event
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);
drop policy if exists attendance_event_create on hrms_attendance.attendance_event;
create policy attendance_event_create on hrms_attendance.attendance_event
for insert with check (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.CREATE')
);

drop policy if exists attendance_day_read on hrms_attendance.attendance_day;
create policy attendance_day_read on hrms_attendance.attendance_day
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);

drop policy if exists attendance_measurement_read on hrms_attendance.attendance_measurement;
create policy attendance_measurement_read on hrms_attendance.attendance_measurement
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);

drop policy if exists computation_run_read on hrms_attendance.computation_run;
create policy computation_run_read on hrms_attendance.computation_run
for select using (
  hrms_attendance.scope_allows(entity_id, location_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);

drop policy if exists attendance_computation_read on hrms_attendance.attendance_computation;
create policy attendance_computation_read on hrms_attendance.attendance_computation
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);

drop policy if exists attendance_decision_read on hrms_attendance.attendance_decision;
create policy attendance_decision_read on hrms_attendance.attendance_decision
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
);

drop policy if exists regularization_request_read on hrms_attendance.regularization_request;
create policy regularization_request_read on hrms_attendance.regularization_request
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.REGULARIZATION_REQUESTS.VIEW')
);
drop policy if exists regularization_request_create on hrms_attendance.regularization_request;
create policy regularization_request_create on hrms_attendance.regularization_request
for insert with check (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.REGULARIZATION_REQUESTS.CREATE')
);

drop policy if exists regularization_action_read on hrms_attendance.regularization_action;
create policy regularization_action_read on hrms_attendance.regularization_action
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.REGULARIZATION_REQUESTS.VIEW')
);
drop policy if exists regularization_action_create on hrms_attendance.regularization_action;
create policy regularization_action_create on hrms_attendance.regularization_action
for insert with check (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and (
    (
      action_type in ('SUBMITTED', 'RESUBMITTED', 'CANCELLED')
      and hrms_attendance.employee_is_self(employee_id)
      and hrms_attendance.has_permission('HRMS_ATTENDANCE.REGULARIZATION_REQUESTS.CREATE')
    )
    or (
      action_type in ('INFO_REQUESTED', 'APPROVED', 'REJECTED')
      and hrms_attendance.has_permission('HRMS_ATTENDANCE.REGULARIZATION_REQUESTS.EDIT')
    )
  )
);

drop policy if exists shift_exception_read on hrms_attendance.shift_exception;
create policy shift_exception_read on hrms_attendance.shift_exception
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.SHIFT_EXCEPTIONS.VIEW')
);

drop policy if exists shift_exception_action_read on hrms_attendance.shift_exception_action;
create policy shift_exception_action_read on hrms_attendance.shift_exception_action
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.SHIFT_EXCEPTIONS.VIEW')
);
drop policy if exists shift_exception_action_create on hrms_attendance.shift_exception_action;
create policy shift_exception_action_create on hrms_attendance.shift_exception_action
for insert with check (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.SHIFT_EXCEPTIONS.EDIT')
);

drop policy if exists co_ledger_read on hrms_attendance.co_ledger_entry;
create policy co_ledger_read on hrms_attendance.co_ledger_entry
for select using (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_LEAVE_MANAGEMENT.LEAVE_LEDGER.VIEW')
);
drop policy if exists co_ledger_create on hrms_attendance.co_ledger_entry;
create policy co_ledger_create on hrms_attendance.co_ledger_entry
for insert with check (
  hrms_attendance.record_scope_allows(entity_id, location_id, employee_id)
  and hrms_attendance.has_permission('HRMS_LEAVE_MANAGEMENT.LEAVE_LEDGER.CREATE')
);

drop policy if exists report_definition_read on hrms_attendance.report_definition;
create policy report_definition_read on hrms_attendance.report_definition
for select using (
  hrms_attendance.scope_allows(entity_id, location_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_REPORTS.VIEW')
);
drop policy if exists report_definition_create on hrms_attendance.report_definition;
create policy report_definition_create on hrms_attendance.report_definition
for insert with check (
  hrms_attendance.scope_allows(entity_id, location_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_REPORTS.CREATE')
);
drop policy if exists report_definition_edit on hrms_attendance.report_definition;
create policy report_definition_edit on hrms_attendance.report_definition
for update
using (
  hrms_attendance.scope_allows(entity_id, location_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_REPORTS.EDIT')
)
with check (
  hrms_attendance.scope_allows(entity_id, location_id)
  and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_REPORTS.EDIT')
);

-- measurement_event has no duplicated tenant columns. Its read permission is
-- inherited by proving access to both linked records.
drop policy if exists measurement_event_read on hrms_attendance.measurement_event;
create policy measurement_event_read on hrms_attendance.measurement_event
for select using (
  exists (
    select 1
    from hrms_attendance.attendance_measurement measurement
    join hrms_attendance.attendance_event event
      on event.event_id = measurement_event.event_id
    where measurement.measurement_id = measurement_event.measurement_id
      and hrms_attendance.record_scope_allows(measurement.entity_id, measurement.location_id, measurement.employee_id)
      and hrms_attendance.has_permission('HRMS_ATTENDANCE.ATTENDANCE_LIST.VIEW')
  )
);

-- Only grant roles that exist. Supabase's service_role/database owner performs
-- trusted computation and decision writes and bypasses RLS; authenticated
-- users remain constrained by the policies above.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema hrms_attendance to authenticated;
    grant select on all tables in schema hrms_attendance to authenticated;
    grant insert on hrms_attendance.attendance_event,
      hrms_attendance.regularization_request,
      hrms_attendance.regularization_action,
      hrms_attendance.shift_exception_action,
      hrms_attendance.co_ledger_entry,
      hrms_attendance.report_definition to authenticated;
    grant update on hrms_attendance.report_definition to authenticated;
  end if;
end;
$$;

commit;
