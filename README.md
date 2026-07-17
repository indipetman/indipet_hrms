# Indipet HRMS Next.js UI

This project is the Next.js handoff of `hrms_dashboard_nav_visual.html`. It preserves the approved interactive HRMS prototype while separating the application into deployable assets and a backend integration boundary.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Project structure

- `app/` - Next.js App Router pages and health endpoint.
- `components/PrototypeRuntime.jsx` - browser bootstrap for the migrated UI.
- `src/prototype/hrms-markup.html` - current HRMS interface markup.
- `app/globals.css` - approved HRMS visual system and page styles.
- `public/hrms-runtime.js` - current prototype interactions and mock records.
- `src/lib/hrms-api.js` - backend API boundary for entities, locations, employees, and rosters.
- `BACKEND_HANDOFF.md` - integration sequence and functional mapping.

## Environment

Copy `.env.example` to `.env.local` and set the backend base URL. Keep `NEXT_PUBLIC_HRMS_DATA_MODE=mock` until API integration begins.

## Refresh from the source prototype

The approved source prototype is included at `legacy/hrms_dashboard_nav_visual.html`.
If it is updated before backend integration, run:

```bash
node scripts/migrate-prototype.mjs
```

This replaces only the generated prototype markup, CSS, and runtime files.
