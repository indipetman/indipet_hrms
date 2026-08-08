const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.resolve(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("HRMS entity and location forms save through the ERP Core API", () => {
  assert.match(html, /async function persistHrmsErpCoreTable\(tableName, rows\)/);
  assert.match(html, /fetch\(`\$\{endpoint\}\/\$\{encodeURIComponent\(tableName\)\}`,[\s\S]*method: "PUT"/);
  assert.match(html, /acknowledgement\?\.ok !== true \|\| Number\(acknowledgement\?\.count\) !== snapshot\.length/);
  assert.match(html, /await persistHrmsErpCoreTable\("entities", hrmsReserveSnapshot\(\)\.entities\)/);
  assert.match(html, /await persistHrmsErpCoreTable\("locations", hrmsReserveSnapshot\(\)\.locations\)/);
});

test("HRMS organization UI waits for acknowledgement and rolls back rejected saves", () => {
  assert.match(html, /\$\("#entityForm"\)\.addEventListener\("submit", async event/);
  assert.match(html, /\$\("#locationForm"\)\.addEventListener\("submit", async event/);
  assert.match(html, /if \(!erpSaved\) applyHrmsReserve\(beforeSnapshot\)/);
  assert.match(html, /applyHrmsReserve\(beforeSnapshot\);\s*showLocationFormError/);
  assert.doesNotMatch(html, /showToast\(`\$\{finalRecord\.legal_name\} created and selected\.`\)/);
});

test("browser recovery snapshots contain HRMS-owned records only", () => {
  assert.match(html, /const ownedSnapshot = HrmsDataBoundary\.ownedSnapshot\(snapshot\)/);
  assert.match(html, /const pendingServerSync = syncMetadata\?\.pending_server_sync === true/);
  assert.match(html, /if \(storedSnapshot\) localStorage\.setItem\(hrmsMockLocalStorageKey/);
  assert.match(html, /else localStorage\.removeItem\(hrmsMockLocalStorageKey\)/);
});

test("department and designation deletion checks ERP Service Master before confirmation", () => {
  assert.match(html, /async function hrmsErpDeleteDependencies/);
  assert.match(html, /ERP Service Master dependency check unavailable/);
  assert.match(html, /await hrmsErpDeleteDependencies\(recordType, recordId, recordName\)/);
});
