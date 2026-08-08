const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "hrms_dashboard_nav_visual.html"), "utf8");
const formatterSource = html.slice(
  html.indexOf("function systemDateToDisplay"),
  html.indexOf("function systemDateTimeToDisplay")
);

test("HRMS formats system dates as DD/MM/YYYY", () => {
  const sandbox = {};
  vm.runInNewContext(`${formatterSource}\nresult = [systemDateToDisplay("2026-08-03"), systemDateToDisplay("3/8/2026")];`, sandbox);
  assert.deepEqual([...sandbox.result], ["03/08/2026", "03/08/2026"]);
  assert.match(html, /<html lang="en-GB">/);
  assert.match(html, /DD\/MM\/YYYY/);
});

test("every HRMS native date input receives the consistent display layer", () => {
  assert.match(html, /function enhanceSystemDateInputs/);
  assert.match(html, /querySelectorAll\?\.\('input\[type="date"\]'\)/);
  assert.match(html, /className = "system-date-value"/);
  assert.match(html, /display\.style\.fontSize = inputStyle\.fontSize/);
  assert.match(html, /display\.style\.fontWeight = inputStyle\.fontWeight/);
  assert.match(html, /systemDateObserver\.observe/);
  assert.match(html, /const displayDate = systemDateToDisplay\(workDate\)/);
  assert.match(html, /cells\[0\] = systemDateToDisplay\(record\.details\?\.work_date \|\| cells\[0\]\)/);
});
