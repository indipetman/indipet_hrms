# Backend Integration Handoff

## Current state

The Next.js project reproduces the approved HRMS prototype. The current records in `public/hrms-runtime.js` are mock data used to demonstrate workflows. No database credentials are stored in the frontend.

The browser exposes the API adapter as `window.IndipetHRMS.api`. Its implementation is in `src/lib/hrms-api.js`.

## Recommended integration order

1. Configure authentication and session handling.
2. Replace initial master-data arrays with API reads.
3. Connect create and update handlers for Entity, Sub Location, Employee, and Shift Policy.
4. Connect Location Operating Hours updates.
5. Connect roster generation, draft review, slot updates, validation, and publishing.
6. Replace mock KPIs with server-calculated summary responses.

## UI-to-backend mapping

| UI workflow | Adapter method |
| --- | --- |
| Entity list/create/update | `hrmsApi.entities.*` |
| Location list/create/update | `hrmsApi.locations.*` |
| Location operating hours | `hrmsApi.locations.operatingHours(locationId)` |
| Location shift policies | `hrmsApi.locations.shiftPolicies(locationId)` |
| Employee list/create/update | `hrmsApi.employees.*` |
| Roster overview | `hrmsApi.rosters.list(query)` |
| Generate roster | `hrmsApi.rosters.generate(input)` |
| Publish roster | `hrmsApi.rosters.publish(rosterId)` |

Endpoint names in the adapter are intentionally centralized. Change them there if the backend uses different routes; the visual layer does not need to be renamed.

## Data ownership

- The backend remains the source of truth for IDs, validation, permissions, audit history, and status transitions.
- The frontend may calculate display-only values such as completion percentages and shift-duration previews, but the backend should validate them before saving.
- Do not expose service-role keys, database passwords, or VPS credentials through `NEXT_PUBLIC_*` variables.

## Prototype handler locations

Search `public/hrms-runtime.js` for these functions when wiring responses:

- `createEntityRecord`
- `createEmployeeRecord`
- `collectLocationFormRecord`
- `createShiftPolicy`
- `saveOperatingHours`
- `generateRosterPreview`
- `renderRosterReview`

Keep API calls in `src/lib/hrms-api.js` or a server route. UI functions should consume clean application records rather than raw database rows wherever possible.

## Health check

`GET /api/health` returns a small JSON health response and can be used by the VPS reverse proxy or uptime monitor.
