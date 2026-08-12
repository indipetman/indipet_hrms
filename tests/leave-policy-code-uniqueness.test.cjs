const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const XLSX = require("xlsx");
const validator = require("../leave-policy-rule-validator.cjs");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

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

const policies = [
  { policy_id: "P1", organization_id: "INDIPET_ROOT", policy_code: "LVP0001", policy_name: "General Leave", status: "Active", version: 1 },
  { policy_id: "P2", organization_id: "INDIPET_ROOT", policy_code: "LVP0002", policy_name: "Special Leave", status: "Active", version: 1 }
];

function rule(ruleId, policyId, leaveCode, leaveName) {
  return {
    rule_id: ruleId,
    policy_id: policyId,
    leave_code: leaveCode,
    leave_name: leaveName,
    paid: true,
    annual_entitlement_days: 6,
    accrual_method: "ANNUAL_UPFRONT",
    carry_forward_enabled: false,
    max_carry_forward_days: 0,
    proof_required: false,
    status: "Active"
  };
}

test("leave codes are normalized and rejected when duplicated across policies", () => {
  assert.equal(validator.normalizeLeaveCode(" c l "), "CL");
  const result = validator.validateUniqueLeaveCodes({
    leave_policies: policies,
    leave_policy_rules: [rule("R1", "P1", "CL", "Casual Leave"), rule("R2", "P2", " c l ", "Copied Leave")]
  });
  assert.equal(result.ok, false);
  assert.equal(result.table, "leave_policy_rules");
  assert.equal(result.blockers[0].leave_code, "CL");
  assert.deepEqual(result.blockers[0].policy_names, ["General Leave", "Special Leave"]);
});

test("Leave Policy UI and server use the shared duplicate-code validator", () => {
  assert.match(html, /<script src="leave-policy-rule-validator\.cjs"><\/script>/);
  assert.match(html, /function syncLeavePolicyRuleCodeValidation/);
  assert.match(html, /leave-policy-code-error/);
  assert.match(serverSource, /import HrmsLeavePolicyRuleValidator from "\.\/leave-policy-rule-validator\.cjs"/);
  assert.match(serverSource, /HrmsLeavePolicyRuleValidator\.validateUniqueLeaveCodes\(nextSnapshot\)/);
});

test("Excel API acknowledges unique codes, rejects a duplicate, and preserves the saved workbook", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-leave-code-"));
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
  const validSnapshot = {
    ...base,
    leave_policies: policies,
    leave_policy_rules: [rule("R1", "P1", "CL", "Casual Leave"), rule("R2", "P2", "SL", "Special Leave")]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(validSnapshot)
  });
  const acknowledgement = await saved.json();
  assert.equal(saved.status, 200);
  assert.equal(acknowledgement.counts.leave_policy_rules, 2);

  const reloaded = await fetch(`${baseUrl}/api/mock-db`).then(response => response.json());
  reloaded.leave_policy_rules[1].leave_code = " cl ";
  const rejected = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": reloaded._server_revision },
    body: JSON.stringify(reloaded)
  });
  const rejection = await rejected.json();
  assert.equal(rejected.status, 409);
  assert.match(rejection.error, /Duplicate Leave Type codes/);
  assert.equal(rejection.blockers[0].leave_code, "CL");

  const preserved = await fetch(`${baseUrl}/api/mock-db`).then(response => response.json());
  assert.deepEqual(preserved.leave_policy_rules.map(item => item.leave_code).sort(), ["CL", "SL"]);
  const workbook = XLSX.readFile(workbookPath);
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets.leave_policy_rules, { defval: "" });
  assert.deepEqual(rows.map(item => item.leave_code).sort(), ["CL", "SL"]);
});
