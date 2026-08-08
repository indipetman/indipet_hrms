const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("roster current page indicator keeps page and total side by side", () => {
  assert.match(html, /class="page-button is-current roster-page-indicator"/);
  assert.match(html, /\.roster-control-view \.roster-page-indicator\s*\{[\s\S]*?white-space:\s*nowrap;/);
  assert.match(html, /\$\{rosterOverviewPage\} \/ \$\{totalPages\}/);
});
