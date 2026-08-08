const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("roster overview exposes a searchable roster field", () => {
  assert.match(html, /id="rosterSearch" type="search"/);
  assert.match(html, /placeholder="Location, code, period or version"/);
  assert.match(html, /function rosterOverviewMatchesSearch\(/);
  assert.match(html, /rosterSearch"\)\.addEventListener\("input"/);
  assert.match(html, /rosterSearchDebounceTimer\s*=\s*setTimeout\([\s\S]*?180\);/);
});

test("roster search applies to the table and filtered exports", () => {
  const usages = html.match(/rosterOverviewMatchesSearch\(record, search\)/g) || [];
  assert.equal(usages.length, 2);
  assert.match(html, /id="rosterResetButton"/);
  assert.doesNotMatch(html, /id="rosterFilterButton"/);
  assert.match(html, /rosterResetButton"\)\.addEventListener\("click"[\s\S]*rosterSearch"\)\.value = ""[\s\S]*rosterIssueFilter"\)\.value = "all"/);
});

test("roster control center hides the page-level export action", () => {
  assert.match(
    html,
    /exportButton\.hidden = \["leave-policy", "attendance-policy", "attendance-list", "roster"\]\.includes\(currentPage\) \|\| !canExport;/
  );
  assert.doesNotMatch(html, /Export the filtered roster overview/);
  assert.match(html, /data-roster-board-action="export"/);
});
