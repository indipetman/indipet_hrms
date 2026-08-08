const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("expanding a navigation group does not make it look like a second active page", () => {
  assert.match(html, /\.nav-parent\.is-open\s*\{[^}]*background:\s*var\(--sidebar-hover\)/s);
  assert.match(html, /\.nav-group:has\(\.nav-child\.is-active\) > \.nav-parent\s*\{[^}]*background:\s*var\(--sidebar-active\)/s);
  assert.doesNotMatch(html, /\.nav-single\.is-active,\s*\.nav-parent\.is-open\s*\{[^}]*background:\s*var\(--sidebar-active\)/s);
});

test("selecting a standalone menu closes any expanded accordion group", () => {
  const activation = html.slice(
    html.indexOf("function activatePage"),
    html.indexOf("function setPageHeader")
  );
  assert.match(activation, /if \(group\) openGroup\(group, true\);/);
  assert.match(activation, /else \$\$\("\.nav-group"\)\.forEach\(openGroupTarget => openGroup\(openGroupTarget, false\)\)/);
});

test("Leave Management submenu follows the agreed operational order", () => {
  const leaveMenu = html.slice(
    html.indexOf('data-page="leave-requests"'),
    html.indexOf('data-page="roster"')
  );
  const orderedPages = ["leave-requests", "leave-ledger", "holiday-calendar", "leave-policy"];
  const positions = orderedPages.map(page => leaveMenu.indexOf(`data-page="${page}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((left, right) => left - right), positions);
});
