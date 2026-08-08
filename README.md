# Indipet HRMS

This repository is intentionally kept clean for rebuilding HRMS from the approved prototype.

## Files

- `hrms_dashboard_nav_visual.html` - approved HRMS UI prototype and current source for rebuilding the app.
- `server.mjs` - local Excel-backed mock data reserve for HRMS-owned workflow data.
- `mock-db/hrms_mock_database.xlsx` - HRMS-owned employees, attendance, attendance and leave policies, policy rules and assignments, holiday calendar records, keyholders, rosters, operating context, department/designation masters, and leave requests.
- `hrms-data-boundary.cjs` - the enforced boundary that removes shared organization data and Role Master rows from HRMS persistence.
- `database/attendance_v2.sql` - additive PostgreSQL/Supabase schema for rebuilding Attendance without changing the legacy prototype tables.
- `database/ATTENDANCE_V2.md` - Attendance V2 data flow, security claims, and staged cutover plan.
- `package.json` - Node scripts and dependency declaration for the mock reserve.

Old handoff archives, PDFs, generated builds, and unrelated experiments should not be committed here.

## Local Data Reserve

Run the same style as ERP:

```bash
npm install
npm run mock:init
npm run mock:server
```

Then open `http://localhost:4318/hrms_dashboard_nav_visual.html`. Run the ERP server on port `4317` at the same time so HRMS can read its entities, locations, roles, and geography from `GET /api/erp-core/organization`.

ERP Core is the single source of truth for entities, locations, Role Master, countries, states, pincodes, and cities. Entity and location forms exposed in HRMS write through the ERP Core API and show success only after ERP acknowledges the exact row count. The HRMS server rejects attempts to write shared fields with HTTP `409`, including Role Master rows sent through `module_rows`. Browser recovery snapshots contain HRMS-owned records only.

HRMS validates every persisted entity and location key against ERP Core and fails closed when ERP is unavailable. Set `ERP_CORE_ORIGIN` when ERP is not running at `http://127.0.0.1:4317`. `HRMS_REQUIRE_ERP_CORE=0` is reserved for isolated automated tests with no ERP fixture.

Department and Designation are HRMS-owned masters. Before either is deleted, HRMS asks ERP Service Master for dependencies; linked services block the delete, and an unavailable ERP server also blocks it.

## Layer Persistence Rule

Every new functional ERP or HRMS layer must persist its business records to the appropriate Excel mock database. A layer is complete only when:

- its Excel table or approved shared `module_rows` record structure is registered in the owning server;
- workbook initialization creates any missing sheet without removing existing records;
- the owning data-boundary snapshot includes the dataset;
- the UI saves and reloads the records through the Excel-backed API;
- a successful save is shown only after the API acknowledges the written table counts; and
- automated tests cover persistence, reload and ERP/HRMS ownership isolation.

Browser `localStorage` is permitted only as a temporary recovery queue when the mock server is unavailable. It is never the authoritative database for a functional layer.

## Production boundary

Deploy only the allowlisted release created by `npm run production:prepare` from the ERP directory. The release excludes every historical workbook, prototype, test, log, upload and generated output. Production startup requires its release marker and refuses `HRMS_REQUIRE_ERP_CORE=0`.

HRMS has no built-in setup administrator or fallback password. The Primary Entity must be created through ERP Core first; HRMS then authenticates against Excel-backed ERP/employee credentials or the ERP handoff. Synced HRMS snapshots and ERP organization records are removed from browser storage; only a pending, unsaved HRMS recovery queue may remain.
