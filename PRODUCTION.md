# ERP–HRMS production data boundary

Do not deploy the development workspace. It contains historical workbooks, prototypes, generated outputs, logs and orphan uploads that are intentionally excluded from production.

## Prepare an allowlisted release

From `indipet_erp`, run:

```powershell
npm run production:prepare
```

The builder creates a new timestamped directory under `releases/`. It fails closed unless:

- ERP transactions contain zero business rows;
- ERP entities, locations and GST registrations contain zero business rows;
- the HRMS workbook contains zero workflow and employee rows;
- ERP organization reference sheets are registered and contain only approved Role Master/geography rows; and
- no hardcoded setup-login shortcut remains.

The release contains only the two runtime applications, their direct helpers, the three authoritative Excel databases and a signed-by-hash release manifest. It never copies backups, prototypes, tests, logs, uploads, outputs, temporary files or `node_modules`.

## First production start

Install dependencies separately inside both release application folders. Configure the first-run ERP credential as server environment variables; never put the values in source code or an `.env` file inside the release:

```powershell
$env:NODE_ENV = "production"
$env:INDIPET_BOOTSTRAP_USER_ID = "<first-run-user-id>"
$env:INDIPET_BOOTSTRAP_PASSWORD = "<strong-secret-at-least-12-characters>"
```

Start ERP and HRMS from the generated release directory. Production startup fails when the release marker is absent or invalid, when an active workbook points at a `backups` directory, or when HRMS connectivity is disabled.

After creating the Primary Entity, its Excel-backed credential becomes authoritative. Rotate and remove the first-run environment secret from the service configuration.

## Persistent data

By default, production uses the three workbooks packaged under each application's `mock-db` directory. A persistent external directory may be used only when it is explicitly set as `INDIPET_PRODUCTION_DATA_ROOT`; the active database paths must remain inside that directory. Never select a pre-migration or backup workbook as an active database.
