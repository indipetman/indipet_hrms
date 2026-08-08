const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const node = process.execPath;

const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

async function waitForHealth(baseUrl) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error("isolated HRMS mock server did not start");
}

test("roster DELETE persists an unlinked deletion and blocks a linked roster", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-roster-delete-"));
  const workbook = path.join(temp, "hrms.xlsx");
  const port = await freePort();
  const child = spawn(node, [path.join(root, "server.mjs")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HRMS_DB_PATH: workbook, HRMS_REQUIRE_ERP_CORE: "0" },
    stdio: "ignore"
  });
  t.after(() => {
    child.kill();
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForHealth(baseUrl);

  const base = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const snapshot = {
    ...base,
    employees: [{
      employee_id: "E2",
      employee_name: "Legacy Employee",
      status: "Active",
      record: { employee_id: "E2", status: "Active" }
    }],
    attendance: [
      { id: "ATT-1", roster_id: "RST-LINKED", source_id: "RST-LINKED" },
      { id: "ATT-LEGACY", employee_id: "E2", location_id: "LOC-2", work_date: "2026-08-09", roster_id: "" }
    ],
    rosters: [
      { roster_id: "RST-LINKED", location_id: "LOC-1", period: "01/08/2026 - 31/08/2026", leave_handling: "ignore" },
      { roster_id: "RST-LEGACY", location_id: "LOC-2", start_date: "2026-08-01", end_date: "2026-08-31", status: "Published" },
      { roster_id: "RST-FREE", location_id: "LOC-1", period: "01/09/2026 - 30/09/2026" }
    ]
  };
  const seeded = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  assert.equal(seeded.status, 200);

  const current = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const missingRevision = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(current)
  });
  assert.equal(missingRevision.status, 428);
  const staleRevision = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": "stale-workbook" },
    body: JSON.stringify(current)
  });
  assert.equal(staleRevision.status, 409);
  assert.match((await staleRevision.json()).error, /stale/i);

  const removed = await fetch(`${baseUrl}/api/mock-db/rosters/RST-FREE`, { method: "DELETE" });
  assert.equal(removed.status, 200);
  assert.deepEqual(await removed.json(), {
    ok: true,
    table: "rosters",
    deleted_id: "RST-FREE",
    count: 2
  });
  const afterDelete = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.deepEqual(afterDelete.rosters.map(record => record.roster_id), ["RST-LINKED", "RST-LEGACY"]);
  assert.equal(afterDelete.rosters[0].leave_handling, "ignore");
  assert.equal(afterDelete.attendance.find(record => record.id === "ATT-LEGACY").roster_id, "RST-LEGACY");

  const blocked = await fetch(`${baseUrl}/api/mock-db/rosters/RST-LINKED`, { method: "DELETE" });
  assert.equal(blocked.status, 409);
  const rejection = await blocked.json();
  assert.deepEqual(rejection.blockers, ["1 attendance record"]);
  const afterRejection = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.deepEqual(afterRejection.rosters.map(record => record.roster_id), ["RST-LINKED", "RST-LEGACY"]);

  const legacyBlocked = await fetch(`${baseUrl}/api/mock-db/rosters/RST-LEGACY`, { method: "DELETE" });
  assert.equal(legacyBlocked.status, 409);
  assert.deepEqual((await legacyBlocked.json()).blockers, ["1 attendance record"]);
});
