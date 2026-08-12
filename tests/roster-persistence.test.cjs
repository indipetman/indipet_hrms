const test = require("node:test");
const assert = require("node:assert/strict");
const { deleteRoster, isDefinitiveValidationRejection, mergeEmployeeBundle, pendingSnapshot, persistEmployeeBundle, persistSnapshot } = require("../roster-persistence.cjs");

const snapshot = {
  entities: [{ entity_id: "IPL101" }],
  rosters: [{ roster_id: "RST-001", status: "Draft" }]
};

test("uses the atomic mock database endpoint when it is available", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ counts: { entities: 1, rosters: 1 }, revision: "rev-2" })
    };
  };

  let acknowledgedRevision = "";
  const result = await persistSnapshot({
    snapshot,
    baseUrl: "/api/mock-db",
    tables: ["entities", "rosters"],
    expectedRevision: "rev-1",
    onRevision: revision => { acknowledgedRevision = revision; },
    request
  });

  assert.equal(result, "excel");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/mock-db");
  assert.equal(calls[0].options.headers["If-Match"], "rev-1");
  assert.equal(acknowledgedRevision, "rev-2");
  assert.deepEqual(JSON.parse(calls[0].options.body), snapshot);
});

test("falls back to sequential table writes for an older running server", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return url === "/api/mock-db" ? { ok: false, status: 404 } : { ok: true, status: 200 };
  };

  const result = await persistSnapshot({ snapshot, baseUrl: "/api/mock-db", tables: ["entities", "rosters"], request });

  assert.equal(result, "excel");
  assert.deepEqual(calls.map(call => call.url), ["/api/mock-db", "/api/mock-db/entities", "/api/mock-db/rosters"]);
  assert.deepEqual(JSON.parse(calls[2].options.body), snapshot.rosters);
});

test("does not trust an older atomic endpoint that silently omits a new table", async () => {
  const policySnapshot = {
    attendance_policies: [{ policy_id: "ATP-1" }],
    attendance_policy_assignments: [{ assignment_id: "APA-1", policy_id: "ATP-1" }]
  };
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    if (url === "/api/mock-db") {
      return {
        ok: true,
        status: 200,
        json: async () => ({ counts: { attendance: 3, rosters: 1 } })
      };
    }
    return { ok: false, status: 404, json: async () => ({ error: "Unknown table" }) };
  };

  const result = await persistSnapshot({
    snapshot: policySnapshot,
    baseUrl: "/api/mock-db",
    tables: ["attendance_policies", "attendance_policy_assignments"],
    request
  });

  assert.equal(result, "browser");
  assert.deepEqual(calls.map(call => call.url), [
    "/api/mock-db",
    "/api/mock-db/attendance_policies"
  ]);
});

test("does not use sequential compatibility writes after a current server rejects the snapshot", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return { ok: false, status: 409, json: async () => ({ error: "Delete blocked" }) };
  };

  const result = await persistSnapshot({ snapshot, baseUrl: "/api/mock-db", tables: ["entities", "rosters"], request });

  assert.equal(result, "browser");
  assert.deepEqual(calls.map(call => call.url), ["/api/mock-db"]);
});

test("reports the exact validation rejection to the caller", async () => {
  let persistenceResult = null;
  const request = async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      error: "Duplicate Leave Type codes are not allowed.",
      table: "leave_policy_rules",
      blockers: [{ detail: "CL already exists in Leave Policy 2026." }]
    })
  });

  const result = await persistSnapshot({
    snapshot,
    baseUrl: "/api/mock-db",
    tables: ["entities", "rosters"],
    request,
    onResult: value => { persistenceResult = value; }
  });

  assert.equal(result, "browser");
  assert.equal(persistenceResult.status, 409);
  assert.equal(persistenceResult.payload.blockers[0].detail, "CL already exists in Leave Policy 2026.");
  assert.equal(isDefinitiveValidationRejection(persistenceResult), true);
  assert.equal(isDefinitiveValidationRejection({ status: 409, payload: { error: "Stale snapshot" } }), false);
});

test("employee save merges only the selected employee into the latest Excel snapshot", async () => {
  const tables = ["employees", "employee_documents", "rosters"];
  const localSnapshot = {
    employees: [
      { employee_id: "EMP-1", employee_name: "Updated One" },
      { employee_id: "LOCAL-STALE", employee_name: "Must not overwrite Excel" }
    ],
    employee_documents: [{ employee_id: "EMP-1", document_id: "DOC-NEW" }],
    rosters: [{ roster_id: "LOCAL-ROSTER" }]
  };
  const latest = {
    _server_revision: "excel-9",
    employees: [
      { employee_id: "EMP-1", employee_name: "Old One" },
      { employee_id: "EMP-2", employee_name: "Current Excel Employee" }
    ],
    employee_documents: [
      { employee_id: "EMP-1", document_id: "DOC-OLD" },
      { employee_id: "EMP-2", document_id: "DOC-2" }
    ],
    rosters: [{ roster_id: "EXCEL-ROSTER" }]
  };
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url, options });
    if (!options.method) return { ok: true, status: 200, json: async () => latest };
    const body = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        counts: Object.fromEntries(tables.map(table => [table, body[table].length])),
        revision: "excel-10"
      })
    };
  };

  let revision = "";
  const result = await persistEmployeeBundle({
    snapshot: localSnapshot,
    employeeId: "EMP-1",
    baseUrl: "/api/mock-db",
    tables,
    onRevision: value => { revision = value; },
    request
  });

  assert.equal(result, "excel");
  assert.equal(revision, "excel-10");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers["If-Match"], "excel-9");
  const saved = JSON.parse(calls[1].options.body);
  assert.deepEqual(saved.employees, [
    { employee_id: "EMP-2", employee_name: "Current Excel Employee" },
    { employee_id: "EMP-1", employee_name: "Updated One" }
  ]);
  assert.deepEqual(saved.employee_documents, [
    { employee_id: "EMP-2", document_id: "DOC-2" },
    { employee_id: "EMP-1", document_id: "DOC-NEW" }
  ]);
  assert.deepEqual(saved.rosters, [{ roster_id: "EXCEL-ROSTER" }]);
});

test("employee save fails closed when Excel does not acknowledge the merged tables", async () => {
  const request = async (url, options = {}) => !options.method
    ? { ok: true, status: 200, json: async () => ({ _server_revision: "excel-1", employees: [] }) }
    : { ok: true, status: 200, json: async () => ({ counts: { employees: 0 }, revision: "excel-2" }) };

  const result = await persistEmployeeBundle({
    snapshot: { employees: [{ employee_id: "EMP-1" }], employee_documents: [] },
    employeeId: "EMP-1",
    baseUrl: "/api/mock-db",
    tables: ["employees", "employee_documents"],
    request
  });

  assert.equal(result, "browser");
});

test("employee bundle merge preserves every unrelated Excel-owned row", () => {
  const merged = mergeEmployeeBundle({
    latest: { employees: [{ employee_id: "EMP-2" }], rosters: [{ roster_id: "RST-2" }] },
    snapshot: { employees: [{ employee_id: "EMP-1" }], rosters: [{ roster_id: "LOCAL" }] },
    employeeId: "EMP-1",
    tables: ["employees", "rosters"]
  });
  assert.deepEqual(merged.employees, [{ employee_id: "EMP-2" }, { employee_id: "EMP-1" }]);
  assert.deepEqual(merged.rosters, [{ roster_id: "RST-2" }]);
});

test("roster deletion succeeds only after the Excel endpoint acknowledges the exact record", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, table: "rosters", deleted_id: "RST-001", count: 0 })
    };
  };

  const result = await deleteRoster({ rosterId: "RST-001", baseUrl: "/api/mock-db", request });

  assert.equal(result.target, "excel");
  assert.equal(calls[0].url, "/api/mock-db/rosters/RST-001");
  assert.equal(calls[0].options.method, "DELETE");
});

test("roster deletion exposes server dependency blockers and does not claim Excel success", async () => {
  const request = async () => ({
    ok: false,
    status: 409,
    json: async () => ({ error: "Delete blocked", blockers: ["1 attendance record"] })
  });

  const result = await deleteRoster({ rosterId: "RST-001", baseUrl: "/api/mock-db", request });

  assert.equal(result.target, "browser");
  assert.equal(result.status, 409);
  assert.deepEqual(result.payload.blockers, ["1 attendance record"]);
});

test("reports browser persistence when the mock server is unavailable", async () => {
  const request = async () => { throw new Error("server unavailable"); };

  const result = await persistSnapshot({ snapshot, baseUrl: "/api/mock-db", tables: ["entities", "rosters"], request });

  assert.equal(result, "browser");
});

test("rejects legacy pending snapshots that have no Excel base revision", () => {
  assert.equal(pendingSnapshot({
    rosters: [{ roster_id: "RST-1", status: "Published" }],
    _sync: { revision: "rev-7", pending_server_sync: true }
  }), null);
  assert.equal(pendingSnapshot({ rosters: [], _sync: { pending_server_sync: false } }), null);
  assert.equal(pendingSnapshot(null), null);
});

test("preserves the server revision required to retry a queued browser snapshot safely", () => {
  const pending = pendingSnapshot({
    rosters: [{ roster_id: "RST-1", status: "Published" }],
    _sync: { revision: "client-7", server_revision: "excel-12", pending_server_sync: true }
  });

  assert.equal(pending.serverRevision, "excel-12");
});
