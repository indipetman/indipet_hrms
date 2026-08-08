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

test("employee document uploads are stored beside the Excel database with reloadable metadata", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-employee-upload-"));
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
  const upload = await fetch(`${baseUrl}/api/employee-document-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee_id: "EMP-UPLOAD-1",
      document_id: "DOC-EMP-UPLOAD-1-AADHAAR",
      file_name: "aadhaar.png",
      mime_type: "image/png",
      data_base64: Buffer.from("employee-document-evidence").toString("base64")
    })
  });
  assert.equal(upload.status, 201);
  const metadata = await upload.json();
  assert.equal(metadata.ok, true);
  assert.equal(metadata.file_name, "aadhaar.png");
  assert.equal(metadata.mime_type, "image/png");
  assert.equal(metadata.file_size_bytes, Buffer.byteLength("employee-document-evidence"));
  assert.match(metadata.stored_path, /^uploads\/employee-documents\/EMP-UPLOAD-1\//);
  assert.equal(fs.existsSync(path.join(temp, ...metadata.stored_path.split("/"))), true);

  const base = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const snapshot = {
    ...base,
    employees: [{ employee_id: "EMP-UPLOAD-1", employee_name: "Upload Example", record: {} }],
    employee_documents: [{
      document_id: "DOC-EMP-UPLOAD-1-AADHAAR",
      employee_id: "EMP-UPLOAD-1",
      document_type: "Aadhaar",
      document_number: "123412341234",
      file_name: metadata.file_name,
      stored_path: metadata.stored_path,
      mime_type: metadata.mime_type,
      file_size_bytes: metadata.file_size_bytes,
      verification_status: "Pending",
      status: "Active"
    }]
  };
  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).counts.employee_documents, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  assert.equal(reloaded.employee_documents[0].stored_path, metadata.stored_path);
  assert.equal(reloaded.employee_documents[0].file_size_bytes, metadata.file_size_bytes);
});
