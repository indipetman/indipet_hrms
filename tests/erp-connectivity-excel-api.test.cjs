const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

const reservePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(error => error ? reject(error) : resolve(port));
  });
});

async function waitForHealth(origin) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error("HRMS test server did not become ready.");
}

test("HRMS Excel API validates ERP-owned keys and fails closed when ERP Core is unavailable", async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "indipet-hrms-erp-connectivity-"));
  const workbook = path.join(tempDir, "hrms_mock_database.xlsx");
  fs.copyFileSync(path.join(root, "mock-db", "hrms_mock_database.xlsx"), workbook);
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const erpPort = await reservePort();
  const erpOrganization = {
    entities: [{ entity_id: "ENT-1", status: "Active" }],
    locations: [{ id: "LOC-1", parentCode: "ENT-1", status: "Active" }]
  };
  let blockedMasterId = "DEP-1";
  const erpServer = http.createServer((request, response) => {
    if (request.url === "/api/erp-core/organization") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(erpOrganization));
      return;
    }
    if (request.url?.startsWith("/api/delete-dependencies")) {
      const url = new URL(request.url, `http://127.0.0.1:${erpPort}`);
      const recordId = url.searchParams.get("record_id");
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        ok: true,
        blockers: recordId === blockedMasterId ? ["ERP Service SVC-1 (Vaccination)"] : []
      }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise(resolve => erpServer.listen(erpPort, "127.0.0.1", resolve));
  let erpClosed = false;
  t.after(() => {
    if (!erpClosed) erpServer.close();
  });

  const hrmsPort = await reservePort();
  const origin = `http://127.0.0.1:${hrmsPort}`;
  const child = spawn(process.execPath, [path.join(root, "server.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(hrmsPort),
      HRMS_DB_PATH: workbook,
      ERP_CORE_ORIGIN: `http://127.0.0.1:${erpPort}`
    },
    stdio: "ignore",
    windowsHide: true
  });
  t.after(() => child.kill());
  await waitForHealth(origin);

  const validEmployee = {
    employee_id: "E1",
    employee_name: "Connected Employee",
    status: "Active",
    record: { parent_entity_id: "ENT-1", location_id: "LOC-1" }
  };
  const validResponse = await fetch(`${origin}/api/mock-db/employees`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([validEmployee])
  });
  assert.equal(validResponse.status, 200);
  const validAck = await validResponse.json();
  assert.equal(validAck.ok, true);
  assert.equal(validAck.count, 1);

  const invalidResponse = await fetch(`${origin}/api/mock-db/employees`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ ...validEmployee, record: { parent_entity_id: "ENT-1", location_id: "LOC-404" } }])
  });
  assert.equal(invalidResponse.status, 409);
  assert.match((await invalidResponse.json()).error, /invalid ERP Core organization references/);

  const department = {
    row_id: "department-master-1",
    pageKey: "department-master",
    name: "Clinical",
    details: { department_code: "DEP-1", department_name: "Clinical" }
  };
  const departmentCreateResponse = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([department])
  });
  assert.equal(departmentCreateResponse.status, 200, await departmentCreateResponse.text());

  const blockedDepartmentDelete = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([])
  });
  assert.equal(blockedDepartmentDelete.status, 409);
  assert.match((await blockedDepartmentDelete.json()).error, /linked ERP services/);

  blockedMasterId = "";
  const unlinkedDepartmentDelete = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([])
  });
  assert.equal(unlinkedDepartmentDelete.status, 200, await unlinkedDepartmentDelete.text());

  const secondDepartment = { ...department, row_id: "department-master-2", name: "Support", details: { department_code: "DEP-2", department_name: "Support" } };
  const secondDepartmentCreate = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([secondDepartment])
  });
  assert.equal(secondDepartmentCreate.status, 200, await secondDepartmentCreate.text());

  await new Promise(resolve => erpServer.close(resolve));
  erpClosed = true;
  const unavailableResponse = await fetch(`${origin}/api/mock-db/employees`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([validEmployee])
  });
  assert.equal(unavailableResponse.status, 503);
  assert.match((await unavailableResponse.json()).error, /ERP Core organization data could not be loaded/);

  const failClosedDepartmentDelete = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([])
  });
  assert.equal(failClosedDepartmentDelete.status, 503);
  assert.match((await failClosedDepartmentDelete.json()).error, /dependencies could not be loaded/);

  const reloaded = await fetch(`${origin}/api/mock-db/employees`).then(response => response.json());
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].record.location_id, "LOC-1");
});
