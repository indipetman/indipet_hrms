const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dedupeModuleRows,
  mergeModuleRows,
  moduleLogicalKey
} = require("../hrms-module-row-store.cjs");

const department = (rowId, code = "RET0001", name = "Retail Store") => ({
  row_id: rowId,
  pageKey: "department-master",
  cells: [code, name, "Retail Store Manager", "All mapped locations", "Active"],
  details: {
    department_code: code,
    department_name: name
  }
});

test("department and designation masters use their business codes as logical keys", () => {
  assert.equal(
    moduleLogicalKey("department-master", department("department-master-42")),
    "department-master:code:ret0001"
  );
  assert.equal(
    moduleLogicalKey("designation-master", {
      pageKey: "designation-master",
      cells: ["RSM0001", "Retail Store Manager", "RET0001"]
    }),
    "designation-master:code:rsm0001"
  );
});

test("deduplicates repeated master rows without removing different departments", () => {
  const rows = dedupeModuleRows([
    department("department-master-1"),
    department("department-master-2"),
    department("department-master-3", "OPS0001", "Operations")
  ]);

  assert.deepEqual(rows.map(row => row.row_id), [
    "department-master-1",
    "department-master-3"
  ]);
});

test("attendance register enforces one logical day per employee", () => {
  const rows = dedupeModuleRows([
    {
      row_id: "attendance-first",
      record_id: "event-group-a",
      pageKey: "attendance-list",
      cells: ["02 Aug 2026", "Karan Singh", "IPL101-NDP-E1527"],
      details: { employee_id: "IPL101-NDP-E1527", work_date: "2026-08-02" }
    },
    {
      row_id: "attendance-second",
      record_id: "event-group-b",
      pageKey: "attendance-list",
      cells: ["02 Aug 2026", "Karan Singh", "IPL101-NDP-E1527"],
      details: { employee_id: "IPL101-NDP-E1527", work_date: "2026-08-02" }
    },
    {
      row_id: "attendance-next-day",
      pageKey: "attendance-list",
      cells: ["03 Aug 2026", "Karan Singh", "IPL101-NDP-E1527"],
      details: { employee_id: "IPL101-NDP-E1527", work_date: "2026-08-03" }
    }
  ]);

  assert.deepEqual(rows.map(row => row.row_id), ["attendance-first", "attendance-next-day"]);
  assert.equal(
    moduleLogicalKey("attendance-list", rows[0]),
    "attendance-list:day:ipl101-ndp-e1527:2026-08-02"
  );
});

test("ERP Core contributes only Role Master rows to the HRMS module store", () => {
  const merged = mergeModuleRows(
    [department("department-master-1")],
    [
      department("department-master-from-erp"),
      {
        row_id: "FRANCHISE_ADMIN",
        pageKey: "role-manager",
        role_id: "FRANCHISE_ADMIN",
        cells: ["Franchisee Admin"]
      }
    ]
  );

  assert.equal(merged.filter(row => row.pageKey === "department-master").length, 1);
  assert.equal(merged.filter(row => row.pageKey === "role-manager").length, 1);
  assert.equal(merged.find(row => row.pageKey === "role-manager").row_id, "FRANCHISE_ADMIN");
});
