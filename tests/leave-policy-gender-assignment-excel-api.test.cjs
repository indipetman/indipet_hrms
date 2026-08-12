const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const XLSX = require("xlsx");

const root = path.resolve(__dirname, "..");

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
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${baseUrl}/api/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("isolated HRMS mock server did not start");
}

test("gender-scoped Leave Policy assignment is acknowledged by Excel and reloads", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-leave-gender-"));
  const workbookPath = path.join(temp, "hrms.xlsx");
  const port = await freePort();
  const child = spawn(process.execPath, [path.join(root, "server.mjs")], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HRMS_DB_PATH: workbookPath, HRMS_REQUIRE_ERP_CORE: "0" },
    stdio: "ignore",
    windowsHide: true
  });
  t.after(() => {
    child.kill();
    fs.rmSync(temp, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForHealth(baseUrl);

  const base = await fetch(`${baseUrl}/api/mock-db`).then(response => response.json());
  const genderAssignment = {
    assignment_id: "LVP-GENDER-INCLUDE-1",
    policy_id: "LVP-GENDER-1",
    organization_id: "INDIPET_ROOT",
    assignment_mode: "INCLUDE",
    target_type: "GENDER",
    target_key: "Female",
    target_label: "Female",
    created_at: "2026-08-10T00:00:00.000Z"
  };
  const response = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify({
      ...base,
      leave_policies: [{
        policy_id: "LVP-GENDER-1",
        organization_id: "INDIPET_ROOT",
        policy_code: "LVP0001",
        policy_name: "Female Leave Policy",
        status: "Active",
        version: 1
      }],
      leave_policy_assignments: [genderAssignment]
    })
  });
  const acknowledgement = await response.json();
  assert.equal(response.status, 200);
  assert.equal(acknowledgement.counts.leave_policy_assignments, 1);

  const reloaded = await fetch(`${baseUrl}/api/mock-db`).then(result => result.json());
  assert.equal(reloaded.leave_policy_assignments[0].target_type, "GENDER");
  assert.equal(reloaded.leave_policy_assignments[0].target_key, "Female");

  const workbook = XLSX.readFile(workbookPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.leave_policy_assignments, { defval: "" });
  assert.equal(rows[0].target_type, "GENDER");
  assert.equal(rows[0].target_key, "Female");
});
