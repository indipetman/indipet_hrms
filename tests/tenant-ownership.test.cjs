const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");
const XLSX = require("xlsx");
const Connectivity = require("../hrms-erp-connectivity.cjs");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");

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
      if ((await fetch(`${origin}/api/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error("HRMS tenant ownership test server did not become ready.");
}

test("HRMS ownership requires the ERP Primary Entity and stamps every business row", () => {
  const snapshot = { module_rows: [{ row_id: "D1", pageKey: "department-master" }] };
  const setup = { tenants: [{ tenant_id: "TEN-INDIPET", status: "Active" }], entities: [], locations: [] };
  const blocked = Connectivity.applyTenantOwnership(snapshot, setup);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.code, "OWNER_CONTEXT_REQUIRED");

  const organization = {
    ...setup,
    entities: [{ tenant_id: "TEN-INDIPET", entity_id: "ENT-1", entity_role: "Primary", status: "Active" }]
  };
  const scoped = Connectivity.applyTenantOwnership({
    employees: [{ employee_id: "E1", record: { parent_entity_id: "ENT-1" } }],
    in_app_notifications: [{ notification_id: "N1", source_type: "ATTENDANCE_WARNING", entity_id: "ENT-1" }],
    module_rows: snapshot.module_rows
  }, organization);
  assert.equal(scoped.ok, true);
  assert.equal(scoped.snapshot.employees[0].tenant_id, "TEN-INDIPET");
  assert.equal(scoped.snapshot.employees[0].record.tenant_id, "TEN-INDIPET");
  assert.equal(scoped.snapshot.in_app_notifications[0].tenant_id, "TEN-INDIPET");
  assert.equal(scoped.snapshot.module_rows[0].tenant_id, "TEN-INDIPET");
});

test("HRMS missing-Primary notice is a functional error guard", () => {
  assert.match(html, /showToast\(`Create the Primary Entity in ERP Core before you \$\{actionName\}\.`, "error"\)/);
  assert.match(html, /if \(blockAddUntilPrimaryEntity\("add records"\)\) return/);
});

test("HRMS API rejects pre-Primary writes, then acknowledges and reloads Tenant ownership", async t => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "indipet-hrms-tenant-"));
  const workbookPath = path.join(tempDir, "hrms_mock_database.xlsx");
  fs.copyFileSync(path.join(root, "mock-db", "hrms_mock_database.xlsx"), workbookPath);
  const legacyWorkbook = XLSX.readFile(workbookPath);
  for (const sheetName of legacyWorkbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(legacyWorkbook.Sheets[sheetName], { header: 1, defval: "" });
    const headers = rows[0] || [];
    if (headers[0] === "tenant_id") headers.shift();
    legacyWorkbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet([headers]);
  }
  XLSX.writeFile(legacyWorkbook, workbookPath);
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const erpPort = await reservePort();
  const organization = {
    tenants: [{ tenant_id: "TEN-INDIPET", status: "Active" }],
    entities: [],
    locations: []
  };
  let ownershipRequestCount = 0;
  let fullOrganizationRequestCount = 0;
  const erpServer = http.createServer((request, response) => {
    if (request.url === "/api/erp-core/ownership") {
      ownershipRequestCount += 1;
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify(organization));
      return;
    }
    if (request.url === "/api/erp-core/organization") {
      fullOrganizationRequestCount += 1;
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "The full directory must not be loaded for ownership validation." }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise(resolve => erpServer.listen(erpPort, "127.0.0.1", resolve));
  t.after(() => erpServer.close());

  const hrmsPort = await reservePort();
  const origin = `http://127.0.0.1:${hrmsPort}`;
  const child = spawn(process.execPath, [path.join(root, "server.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(hrmsPort),
      HRMS_DB_PATH: workbookPath,
      ERP_CORE_ORIGIN: `http://127.0.0.1:${erpPort}`
    },
    stdio: "ignore",
    windowsHide: true
  });
  t.after(() => child.kill());
  await waitForHealth(origin);

  const department = {
    row_id: "department-master-tenant-test",
    pageKey: "department-master",
    name: "Clinical",
    details: { department_code: "CLN", department_name: "Clinical" }
  };
  const blockedResponse = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([department])
  });
  assert.equal(blockedResponse.status, 409);
  assert.equal((await blockedResponse.json()).code, "OWNER_CONTEXT_REQUIRED");

  organization.entities.push({
    tenant_id: "TEN-INDIPET",
    entity_id: "ENT-PRIMARY",
    entity_role: "Primary",
    status: "Active"
  });
  const saveResponse = await fetch(`${origin}/api/mock-db/module_rows`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([department])
  });
  const acknowledgement = await saveResponse.json();
  assert.equal(saveResponse.status, 200);
  assert.equal(acknowledgement.ok, true);
  assert.equal(acknowledgement.count, 1);
  assert.ok(ownershipRequestCount >= 2);
  assert.equal(fullOrganizationRequestCount, 0);

  const reloaded = await fetch(`${origin}/api/mock-db/module_rows`).then(response => response.json());
  assert.equal(reloaded[0].tenant_id, "TEN-INDIPET");
  const workbook = XLSX.readFile(workbookPath);
  for (const sheetName of workbook.SheetNames) {
    const headers = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" })[0] || [];
    assert.equal(headers[0], "tenant_id", `${sheetName} must be Tenant-owned`);
  }
  assert.ok(fs.readdirSync(tempDir).some(name => name.includes("pre-tenant-ownership")));
});
