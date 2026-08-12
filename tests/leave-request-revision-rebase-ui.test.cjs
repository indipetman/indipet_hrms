const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const persistenceSource = html.slice(
  html.indexOf("function hrmsPersistenceFailureDetail"),
  html.indexOf("async function persistEmployeeRecordToExcel")
);
const submitSource = html.slice(
  html.indexOf('if (submissionPage === "leave-requests")'),
  html.indexOf('if (submissionPage === "holiday-calendar")')
);

test("leave request saves detect only an Excel revision conflict for automatic retry", () => {
  assert.match(persistenceSource, /function hrmsPersistenceRevisionConflict/);
  assert.match(persistenceSource, /status === 409 && \/stale\|revision\//);
  assert.match(submitSource, /persistenceTarget !== "excel" && hrmsPersistenceRevisionConflict\(\)/);
  assert.doesNotMatch(submitSource, /if \(persistenceTarget !== "excel"\) \{\s*const retryResult/);
});

test("stale leave requests rebase on the latest Excel snapshot before retrying", () => {
  assert.match(persistenceSource, /async function rebaseLeaveRequestOnLatestExcel/);
  assert.match(persistenceSource, /fetch\(hrmsMockApi\.baseUrl, \{ cache: "no-store" \}\)/);
  assert.match(persistenceSource, /const latestRevision = String\(latestSnapshot\?\._server_revision/);
  assert.match(persistenceSource, /const rollbackSnapshot = HrmsDataBoundary\.ownedSnapshot\(latestSnapshot\)/);
  assert.match(persistenceSource, /applyHrmsReserve\(latestSnapshot\);\s*hrmsServerRevision = latestRevision/);
  assert.match(persistenceSource, /upsertLeaveRequestIntoActiveReserve\(row, source\)/);
  assert.match(persistenceSource, /recalculateRosterMetrics\(record\)/);
  assert.match(persistenceSource, /reconcileLeaveLedgerEntries\(\);\s*syncLeaveLedgerPage\(\);\s*const target = await persistHrmsReserve\(\)/);
});

test("leave request rebase upserts one business request without dropping newer Excel rows", () => {
  assert.match(persistenceSource, /function upsertLeaveRequestIntoActiveReserve/);
  assert.match(persistenceSource, /source\.request_id \|\| source\.row_id \|\| source\.details\?\.request_id \|\| row\[0\]/);
  assert.match(persistenceSource, /if \(existingIndex >= 0\)[\s\S]*rows\[existingIndex\] = nextRow;[\s\S]*sources\[existingIndex\] = nextSource;[\s\S]*else[\s\S]*rows\.push\(nextRow\);[\s\S]*sources\.push\(nextSource\)/);
});

test("failed leave saves roll back to the freshest known snapshot and expose the API reason", () => {
  assert.match(submitSource, /let rollbackSnapshot = beforeSnapshot/);
  assert.match(submitSource, /rollbackSnapshot = retryResult\.rollbackSnapshot \|\| beforeSnapshot/);
  assert.match(submitSource, /const failureDetail = hrmsPersistenceFailureDetail\(\)/);
  assert.match(submitSource, /applyHrmsReserve\(rollbackSnapshot\)/);
  assert.match(submitSource, /Leave request was not saved\. \$\{failureDetail\} Your entered values remain in this form\./);
});
