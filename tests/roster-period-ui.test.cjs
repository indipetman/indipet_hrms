const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const parserSource = html.slice(
  html.indexOf("function parseRosterPeriod"),
  html.indexOf("function rosterBoardDates")
);
const context = {};
vm.runInNewContext(`${parserSource}; globalThis.parseRosterPeriod = parseRosterPeriod;`, context);

const dateParts = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

test("roster board parses the system DD/MM/YYYY period", () => {
  const period = context.parseRosterPeriod("01/08/2026 - 31/08/2026");
  assert.ok(period);
  assert.deepEqual(dateParts(period.start), [2026, 8, 1]);
  assert.deepEqual(dateParts(period.end), [2026, 8, 31]);
});

test("roster board remains compatible with ISO and legacy month-name periods", () => {
  const iso = context.parseRosterPeriod("2026-08-01 - 2026-08-31");
  const legacy = context.parseRosterPeriod("01 Aug 2026 - 31 Aug 2026");
  assert.deepEqual(dateParts(iso.start), [2026, 8, 1]);
  assert.deepEqual(dateParts(iso.end), [2026, 8, 31]);
  assert.deepEqual(dateParts(legacy.start), [2026, 8, 1]);
  assert.deepEqual(dateParts(legacy.end), [2026, 8, 31]);
});

test("roster board rejects invalid or reversed periods", () => {
  assert.equal(context.parseRosterPeriod("31/02/2026 - 01/03/2026"), null);
  assert.equal(context.parseRosterPeriod("31/08/2026 - 01/08/2026"), null);
});
