const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const packageRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(packageRoot, "..");
const html = fs.readFileSync(path.join(packageRoot, "hrms_dashboard_nav_visual.html"), "utf8");
const ProductionRuntime = require(path.join(__dirname, "..", "production-runtime.cjs"));

test("HRMS production cannot disable ERP Core connectivity", () => {
  const fakeAppDir = path.join(workspaceRoot, "indipet_hrms");
  assert.throws(() => ProductionRuntime.assertProductionRuntime({
    appName: "indipet_hrms",
    appDir: fakeAppDir,
    databasePaths: [path.join(fakeAppDir, "mock-db", "hrms_mock_database.xlsx")],
    env: { NODE_ENV: "production", HRMS_REQUIRE_ERP_CORE: "0" }
  }), /release builder|test-only/);
});

test("synced HRMS and ERP organization records are not retained in browser storage", () => {
  assert.match(html, /if \(storedSnapshot\) localStorage\.setItem\(hrmsMockLocalStorageKey/);
  assert.match(html, /else localStorage\.removeItem\(hrmsMockLocalStorageKey\)/);
  assert.match(html, /const sourceData = apiData \|\| \{\};/);
  assert.match(html, /hrmsErpCoreMemoryReserve = data && typeof data === "object" \? data : null/);
  assert.doesNotMatch(html, /writeHrmsJsonStorage\(hrmsErpOrganizationStorageKey/);
});

test("HRMS contains no setup credential shortcut", () => {
  assert.doesNotMatch(html, /isHrmsSetupAdminLogin|isHrmsSetupAdminUserId|source: "hrms-setup"/);
  assert.match(html, /No Excel-backed Primary Entity login exists/);
});
