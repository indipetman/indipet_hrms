const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

test("HRMS brand squares use the supplied Indipet logo instead of IP text", () => {
  assert.ok(fs.existsSync(path.join(root, "Indipet Logo White.png")));
  assert.equal((html.match(/src="Indipet Logo White\.png\?v=white-large-3"/g) || []).length, 3);
  assert.doesNotMatch(html, />\s*IP\s*</);
  assert.match(html, /\.hrms-login-logo \{[\s\S]*?width:\s*50px[\s\S]*?height:\s*50px/);
  assert.match(html, /\.brand-mark \{[\s\S]*?width:\s*42px[\s\S]*?height:\s*42px[\s\S]*?flex:\s*0 0 42px/);
  assert.match(html, /\.hrms-login-logo img,[\s\S]*?\.brand-mark img[\s\S]*?width:\s*84%[\s\S]*?height:\s*84%[\s\S]*?object-fit:\s*contain/);
  assert.doesNotMatch(html, /\.hrms-login-logo img,[\s\S]*?\.brand-mark img\s*\{[^}]*filter:/);
  assert.match(server, /decodeURIComponent\(url\.pathname\) === "\/Indipet Logo White\.png"[\s\S]*?"Content-Type": "image\/png"/);
});
