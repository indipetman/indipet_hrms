const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("HRMS consumes and clears the one-time ERP handoff before requiring login", () => {
  assert.match(html, /hrmsLaunchParams\.get\("handoff"\)/);
  assert.match(html, /fetch\(`\$\{origin\}\/api\/auth\/hrms-handoff\/\$\{encodeURIComponent\(hrmsHandoffTicket\)\}`/);
  assert.match(html, /cleanUrl\.searchParams\.delete\("handoff"\)/);
  assert.match(html, /writeHrmsJsonStorage\(hrmsSharedSessionStorageKey, payload\.session\)/);
  assert.match(html, /async function initializeHrmsAccess\(\)/);
  assert.match(html, /await consumeHrmsHandoffTicket\(\)/);
});

test("an ERP launch cannot fall back to a stale HRMS browser session", () => {
  assert.doesNotMatch(html, /consumeHrmsWindowSession/);
  assert.doesNotMatch(html, /handoff\.session \|\| currentHrmsSession\(\)/);
  assert.match(html, /if \(hrmsOpenedFromErp\) \{\s*removeHrmsStorage\(hrmsSharedSessionStorageKey\);\s*removeHrmsStorage\(hrmsErpAuthStorageKey\);/s);
  assert.match(html, /if \(handoff\.session && hrmsSessionHasWorkspaceAccess\(handoff\.session\)\) return true;/);
  assert.match(html, /A secure ERP sign-in handoff is required/);
});

test("HRMS completes the verified handoff before loading or revealing tenant data", () => {
  assert.match(html, /const accessGranted = await initializeHrmsAccess\(\);\s*await loadHrmsReserve\(\);/s);
  assert.match(html, /if \(accessGranted\) \{\s*reconcileOperatingEntityContext\(\);\s*renderProfileFromOperatingContext\(\);\s*revealHrmsApp\(\);/s);
});

test("direct HRMS login has no built-in setup administrator", () => {
  assert.doesNotMatch(html, /isHrmsSetupAdminUserId|isHrmsSetupAdminLogin|source: "hrms-setup"/);
  assert.match(html, /No Excel-backed Primary Entity login exists\. Complete first-run setup in ERP Core/);
  assert.match(html, /source: "hrms-primary"/);
});

test("direct HRMS Primary login requires the exact active Excel-backed credential", () => {
  assert.match(html, /const userMatches = user\.toLowerCase\(\) === credential\.user_id\.toLowerCase\(\)/);
  assert.match(html, /const passwordMatches = password === credential\.password/);
  assert.match(html, /credential\.status === "Inactive" \|\| !userMatches \|\| !passwordMatches/);
});
