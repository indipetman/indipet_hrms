const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const LocationScope = require("../hrms-location-scope.cjs");
const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.mjs"), "utf8");

const locations = [{ id: "IND0001-NDP001", name: "Indipet Kolkata HQ", listName: "Indipet Kolkata HQ" }];
const employees = [["IND0001-NDP-E1529", "Arpita Sen", "Indipet Kolkata HQ", "HR", "Executive", "Active"]];
const employeeDetails = {
  "IND0001-NDP-E1529": { location_id: "IND0001-NDP001", location_label: "Indipet Kolkata HQ" }
};

test("leave requests inherit their location through the Excel-backed employee reference", () => {
  const matched = LocationScope.rowMatchesLocation({
    filter: "IND0001-NDP001",
    locations,
    row: ["LR-1", "Arpita Sen", "Casual Leave", "18/06/2026", "Pending"],
    source: { employee_id: "IND0001-NDP-E1529", details: { employee_id: "IND0001-NDP-E1529" } },
    employeeRows: employees,
    employeeDetails
  });
  assert.equal(matched, true);
});

test("location labels and IDs resolve to the same scope", () => {
  const input = {
    locations,
    row: ["LR-1", "Arpita Sen", "Casual Leave", "18/06/2026", "Pending"],
    source: { location_id: "IND0001-NDP001" },
    employeeRows: employees,
    employeeDetails
  };
  assert.equal(LocationScope.rowMatchesLocation({ ...input, filter: "IND0001-NDP001" }), true);
  assert.equal(LocationScope.rowMatchesLocation({ ...input, filter: "Indipet Kolkata HQ" }), true);
  assert.equal(LocationScope.rowMatchesLocation({ ...input, filter: "OTHER-LOCATION" }), false);
  assert.equal(LocationScope.rowMatchesLocation({ ...input, filter: "all" }), true);
});

test("the HRMS server exposes the shared browser resolver", () => {
  assert.match(serverSource, /url\.pathname === "\/hrms-location-scope\.cjs"/);
  assert.match(serverSource, /readFileSync\(path\.join\(__dirname, "hrms-location-scope\.cjs"\), "utf8"\)/);
});
