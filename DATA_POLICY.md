# Repository data policy

The Git-ready repository may contain only these active Excel databases:

- `indipet_erp/mock-db/erp_mock_database.xlsx`
- `indipet_erp/mock-db/erp_core_organization_database.xlsx`
- `indipet_hrms/mock-db/hrms_mock_database.xlsx`

ERP transaction tables and HRMS workflow tables must contain zero business rows. ERP organization entities, locations, and GST registrations must also contain zero rows. Organization reference geography and the baseline Admin role are schema/reference data and are intentionally retained.

Automated tests contain synthetic fixtures such as example employees, entities, IDs, and dates. They are not loaded by either application and are required to prove persistence, ownership, connectivity, delete integrity, and production safety.

Historical workbooks, migration snapshots, uploads, exports, prototypes, logs, releases, temporary files, and nested Git histories remain outside the Git-ready package. They are recovery material, not application source.
