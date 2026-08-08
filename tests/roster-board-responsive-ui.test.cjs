const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");

test("roster board owns its horizontal overflow inside the card", () => {
  assert.match(html, /\.roster-board-shell\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-x:\s*auto;[\s\S]*?box-sizing:\s*border-box;/);
  assert.match(html, /\.roster-board-table-wrap\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;[\s\S]*?overflow:\s*hidden;/);
  assert.match(html, /\.roster-board-panel\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/);
});

test("roster board uses one width model for calculated and rendered day columns", () => {
  assert.match(html, /const boardWidth = 230 \+ \(dates\.length \* 152\);/);
  assert.match(html, /\.roster-board-table th,[\s\S]*?\.roster-board-table td\s*\{[\s\S]*?width:\s*152px;[\s\S]*?box-sizing:\s*border-box;/);
  assert.match(html, /\.roster-board-table \.employee-column\s*\{[\s\S]*?width:\s*230px;/);
});

test("frozen employee content cannot overlap scrolled roster cells", () => {
  assert.match(html, /\.roster-board-table \.employee-column\s*\{[\s\S]*?max-width:\s*230px;[\s\S]*?overflow:\s*hidden;[\s\S]*?background-clip:\s*padding-box;/);
  assert.match(html, /\.roster-employee\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;/);
  assert.match(html, /\.roster-employee-name-text,[\s\S]*?\.roster-employee \.field-help\s*\{[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/);
  assert.match(html, /class="roster-employee-name-text"/);
});

test("roster board uses only its native lower horizontal scrollbar", () => {
  assert.doesNotMatch(html, /data-roster-board-scrollbar/);
  assert.doesNotMatch(html, /bindRosterBoardHorizontalScroll/);
  assert.match(html, /\.roster-board-shell\s*\{[\s\S]*?overflow-x:\s*auto;/);
});

test("roster board does not trap normal vertical page scrolling", () => {
  const shellCss = html.match(/\.roster-board-shell\s*\{([^}]*)\}/)?.[1] || "";
  assert.match(shellCss, /max-height:\s*none;/);
  assert.match(shellCss, /overflow-y:\s*visible;/);
  assert.doesNotMatch(shellCss, /overscroll-behavior:\s*contain;/);
  assert.doesNotMatch(html, /\.roster-board-shell[\s\S]*?addEventListener\("wheel"/);
});

test("roster board content follows the card gutter instead of touching its edges", () => {
  assert.match(html, /\.roster-board-table-wrap\s*\{[\s\S]*?padding:\s*16px 24px 18px;[\s\S]*?box-sizing:\s*border-box;/);
  assert.match(html, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.roster-board-table-wrap\s*\{[\s\S]*?padding:\s*12px;/);
});
