# Indipet HRMS

This repository is intentionally kept clean for rebuilding HRMS from the approved prototype.

## Files

- `hrms_dashboard_nav_visual.html` - approved HRMS UI prototype and current source for rebuilding the app.
- `server.mjs` - local Excel-backed mock data reserve used while HRMS is being converted into a functional app.
- `mock-db/hrms_mock_database.xlsx` - generated local workbook for HRMS reserve data. It starts empty.
- `package.json` - Node scripts and dependency declaration for the mock reserve.
- `supabase_schema.sql` - HRMS database/schema reference for backend planning.
- `generate_hrms_schema_pdf.js` - helper script for generating HRMS schema documentation from the schema source.

Old handoff archives, PDFs, generated builds, and unrelated experiments should not be committed here.

## Local Data Reserve

Run the same style as ERP:

```bash
npm install
npm run mock:init
npm run mock:server
```

Then open `http://localhost:4318/hrms_dashboard_nav_visual.html`. If the server is offline, the UI falls back to browser storage so testing can continue locally.
