# Excel Persistence Contract

This contract applies to every ERP and HRMS layer developed in this workspace.

- A functional layer is not complete until its business records are stored in the appropriate Excel mock database and reload successfully through the mock API.
- ERP Core owns shared organization data such as entities, locations, roles and geography. HRMS owns HRMS workflow data. Do not duplicate the same authoritative records across both databases.
- Add every new persisted dataset to the owning server's table configuration and workbook initialization/migration flow.
- Add the dataset to the applicable data-boundary snapshot so reads and writes use the correct owner.
- Load and save layer data through the mock API. Do not use browser `localStorage` as the layer's source of truth.
- Browser storage may hold a temporary recovery queue only. The UI must not report a successful database save until the Excel-backed API acknowledges the requested table counts.
- Add automated coverage for table registration, save acknowledgement, reload behavior and ownership isolation.
- Preserve existing workbook records when adding a sheet or changing a schema, and create a recoverable backup before a material workbook migration.

# Delete Integrity Contract

This contract applies to every current and future ERP and HRMS layer in this workspace.

- Every business-record delete action must open an in-application confirmation dialog. Native browser `confirm()` and silent deletion are not allowed.
- Before confirmation, resolve dependencies across the owning Excel databases. If another record, transaction, assignment, roster, ledger or workflow references the target, deletion must be blocked and the dialog must list the linked data that must be removed first.
- Dependency checks must fail closed when an owning database cannot be reached. Do not permit deletion merely because dependency data could not be loaded.
- Enforce referential integrity in the mock API as well as the UI so direct or stale clients cannot bypass the rule.
- Do not silently cascade-delete linked business records. The linked records must be removed or reassigned first; then the user may retry deletion.
- Add automated coverage for the confirmation dialog, blocked dependency behavior, successful unlinked deletion and server-side rejection.
