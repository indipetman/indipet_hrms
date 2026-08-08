const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "..", "hrms_dashboard_nav_visual.html");
const html = fs.readFileSync(htmlPath, "utf8");

test("roster colors are assigned from active shift records instead of shift names", () => {
  assert.doesNotMatch(html, /\/closing\/i\.test/);
  assert.doesNotMatch(html, /index\s*%\s*2\s*\?\s*["']green["']\s*:\s*["']blue["']/);
  assert.match(html, /function rosterShiftTone\(location, shiftOrAssignment\)/);
  assert.match(html, /rosterShiftToneStyle\(location, assignment\)/);
});

test("legend and cells share the same dynamic shift tone", () => {
  assert.match(html, /class="roster-cell shift-tone/);
  assert.match(html, /class="badge roster-shift-legend" style="\$\{rosterShiftToneStyle\(location, shift\)\}"/);
  assert.match(html, /\.roster-cell\.shift-tone/);
  assert.match(html, /\.badge\.roster-shift-legend/);
});

test("palette contains at least three distinct shift colors", () => {
  const paletteBlock = html.match(/const rosterShiftPalette = \[([\s\S]*?)\n\s*\];/);
  assert.ok(paletteBlock, "shift palette should be declared");
  const backgrounds = [...paletteBlock[1].matchAll(/background:\s*"([^"]+)"/g)].map(match => match[1]);
  assert.ok(backgrounds.length >= 3, "at least three shift colors should be available");
  assert.equal(new Set(backgrounds).size, backgrounds.length, "every configured shift color should be distinct");
});

