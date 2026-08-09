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

# Tenant and Legal Ownership Contract

This contract applies to every current and future ERP, HRMS, payroll, ecommerce and accounting layer in this workspace.

- ERP Core owns the hidden tenant/workspace registry. HRMS and future applications consume that tenant identity; they must not create a second authoritative tenant record.
- Every persisted business record must carry `tenant_id`. Statutory reference masters such as country, state, city and pincode may remain system-scoped.
- Every legal, payroll, inventory, tax, ledger, journal and transaction record must also carry the owning `entity_id` (or the established entity field such as `organization_id`) and `location_id` when operationally applicable.
- Customer, vendor, product, service, department or other tenant-wide identity masters may be shared only through an explicit entity relationship/mapping. Never infer sharing from a missing Entity ID.
- The authenticated server context or ERP Core ownership context must derive Tenant and Entity ownership. Never trust arbitrary Tenant or Entity identifiers supplied by a browser client.
- Before the Primary Entity exists, UI and API writes for business records must fail closed with an actionable ownership error. Setup access may create the tenant and Primary Entity only.
- Reads, writes, exports, backups, deletes and future CA/GST/accounting extracts must preserve tenant isolation and legal-entity boundaries.
- Add automated coverage for pre-Primary rejection, Tenant/Entity stamping, mismatched-scope rejection, Excel acknowledgement, reload and cross-tenant isolation.
