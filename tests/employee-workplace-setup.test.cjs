const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const sqlSchema = fs.readFileSync(path.join(root, "supabase_schema.sql"), "utf8");
const node = process.execPath;

test("employee create uses a targeted Excel transaction and rolls browser recovery back on failure", () => {
  assert.match(html, /persistEmployeeRecordToExcel\(employeeId\)/);
  assert.match(html, /HrmsRosterPersistence\.persistEmployeeBundle/);
  assert.match(html, /restoreEmployeeSaveSnapshot\(beforeSnapshot\)/);
  assert.doesNotMatch(html, /if \(await persistHrmsReserve\(\) !== "excel"\) \{\s*applyHrmsReserve\(beforeSnapshot\);\s*throw new Error\("The Excel database did not acknowledge the employee save\."\)/);
  assert.match(html, /const sourceData = apiData \|\| \{\};/);
  assert.doesNotMatch(html, /const sourceData = browserHasPendingServerSync \? browserData/);
  assert.match(html, /browserData\?\._sync\?\.pending_server_sync !== true/);
});

function employeeSection(index) {
  const start = html.indexOf(`data-employee-section="${index}"`);
  assert.notEqual(start, -1, `employee section ${index} should exist`);
  const next = html.indexOf("data-employee-section=", start + 1);
  return html.slice(start, next === -1 ? html.length : next);
}

function controlOccurrences(field) {
  return (html.match(new RegExp(`<[^>]+data-employee-field="${field}"`, "g")) || []).length;
}

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

test("Employee wizard presents the approved seven-step workflow", () => {
  assert.match(html, /data-employee-step="1"[\s\S]*?<span class="entity-step-name">Workplace Setup<\/span>/);
  assert.match(html, /data-employee-step="2"[\s\S]*?<span class="entity-step-name">Personal<\/span>/);
  assert.match(html, /data-employee-step="4"[\s\S]*?<span class="entity-step-name">Document Center<\/span>/);
  assert.match(html, /data-employee-step="5"[\s\S]*?<span class="entity-step-name">Finance &amp; Benefits<\/span>/);
  assert.match(html, /data-employee-step="6"[\s\S]*?<span class="entity-step-name">Review<\/span>/);
  assert.match(html, /#employeeStepper\s*\{[\s\S]*?grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);[\s\S]*?overflow: hidden;/);
  assert.doesNotMatch(html, /#employeeStepper\s*\{[^}]*overflow-x: auto;/);
  assert.match(html, /#employeeStepper \.entity-step-name\s*\{[^}]*white-space: normal;/);
  assert.doesNotMatch(html, /<span class="entity-step-name">Assignment<\/span>/);
  assert.doesNotMatch(html, /<span class="entity-step-name">Work Setup<\/span>/);
  assert.doesNotMatch(html, /<span class="entity-step-name">KYC<\/span>/);
  assert.doesNotMatch(html, /<span class="entity-step-name">Documents &amp; Skills<\/span>/);
  assert.doesNotMatch(html, /<span class="entity-step-name">Access &amp; Personal Profile<\/span>/);
});

test("Employee wizard has a compact phone layout without horizontal step overflow", () => {
  assert.match(html, /@media \(max-width: 700px\) \{[\s\S]*?\.topbar > \.search-box \{\s*display: none;/);
  assert.match(html, /@media \(max-width: 700px\) \{[\s\S]*?#employeeStepper \{[\s\S]*?grid-template-columns: repeat\(7, minmax\(0, 1fr\)\);[\s\S]*?overflow: hidden;/);
  assert.match(html, /#employeeStepper \.entity-step > span:last-child \{\s*display: none;/);
  assert.match(html, /#employeeStepper \.entity-step \{[\s\S]*?min-width: 0;[\s\S]*?justify-content: center;/);
  assert.match(html, /@media \(max-width: 1180px\) \{[\s\S]*?\.employee-form-shell \{\s*grid-template-columns: 1fr;/);
  assert.doesNotMatch(html, /@media \(max-width: 700px\) \{[\s\S]*?#employeeStepper \{[^}]*overflow-x: auto;/);
});

test("sales eligibility and the four roster-preference controls live only inside Workplace Setup", () => {
  const workplace = employeeSection(1);
  const access = employeeSection(2);
  const documents = employeeSection(4);
  const fields = [
    "is_salesperson",
    "default_shift_id",
    "shift_preference_mode",
    "preferred_week_off_day",
    "shift_restriction_note"
  ];

  for (const field of fields) {
    assert.match(workplace, new RegExp(`data-employee-field="${field}"`));
    assert.doesNotMatch(access, new RegExp(`data-employee-field="${field}"`));
    assert.doesNotMatch(documents, new RegExp(`data-employee-field="${field}"`));
    assert.equal(controlOccurrences(field), 1, `${field} control must not be duplicated`);
  }

  assert.match(workplace, /<h3>Roster Preferences<\/h3>/);
  assert.match(documents, /Identity Documents/);
  assert.match(documents, /Highest Qualification/);
  assert.match(documents, /<h3>Experience<\/h3>/);
  assert.match(documents, /<h3>Skills<\/h3>/);
});

test("employee section schema associates roster preferences with Workplace Setup without making optional fields mandatory", () => {
  assert.match(html, /name: "Workplace Setup",[\s\S]*?section: 1,[\s\S]*?"is_salesperson", "default_shift_id", "shift_preference_mode", "preferred_week_off_day", "shift_restriction_note"[\s\S]*?requiredFields: \["parent_entity_id", "location_id", "department_id", "designation_id"\]/);
  assert.match(html, /name: "Document Center",[\s\S]*?section: 4,[\s\S]*?requiredFields: \["aadhaar_number", "pan_number"\]/);
  assert.match(html, /name: "Finance & Statutory Benefits",[\s\S]*?section: 5,[\s\S]*?requiredFields: \["bank_name", "account_number", "ifsc_code"\]/);
  assert.match(html, /return \(section\.requiredFields \|\| section\.fields\)\.every/);
});

test("Document Center provides manual verification, highest qualification and evidence uploads", () => {
  const documents = employeeSection(4);
  for (const field of ["aadhaar_number", "pan_number", "qualification_level"]) {
    assert.match(documents, new RegExp(`data-employee-field="${field}"`));
  }
  assert.match(documents, /myaadhaar\.uidai\.gov\.in\/check-aadhaar-validity\/en" target="_blank"/);
  assert.match(documents, /eportal\.incometax\.gov\.in\/iec\/foservices\/#\/pre-login\/verifyYourPAN" target="_blank"/);
  assert.match(documents, /<option>Engineering \/ Technology<\/option>/);
  assert.match(documents, /<option>Postgraduate \/ Master's<\/option>/);
  assert.match(documents, /class="employee-upload-input" id="aadhaarDocumentFile" type="file"[^>]*application\/pdf/);
  assert.match(documents, /class="employee-upload-input" id="educationCertificateFile" type="file"[^>]*application\/pdf/);
  assert.match(documents, /<span class="location-form-label">Aadhaar Check<\/span>[\s\S]*?Verify on UIDAI/);
  assert.match(documents, /<span class="location-form-label">PAN Check<\/span>[\s\S]*?Verify PAN/);
  assert.match(documents, /id="addEmployeeExperience"/);
  assert.match(documents, /id="employeeExperienceList"/);
  assert.match(documents, /id="addEmployeeSkill"/);
  assert.match(documents, /id="employeeSkillList"/);
  assert.doesNotMatch(documents, /Experience &amp; Skills/);
  assert.match(html, /function renderEmployeeExperienceRows\(\)/);
  assert.match(html, /function renderEmployeeSkillRows\(\)/);
  assert.match(html, /employeeDynamicUploadKind\("EXPERIENCE"/);
  assert.match(html, /employeeDynamicUploadKind\("SKILL"/);
});

test("Document verification buttons align with the adjacent status controls", () => {
  assert.match(html, /\.employee-document-action\s*\{[\s\S]*?gap: 0;/);
  assert.match(html, /\.employee-document-action \.button\s*\{[\s\S]*?height: 40px;[\s\S]*?min-height: 40px;/);
});

test("Finance and statutory benefits use one linked record and conditional PF and ESI controls", () => {
  const finance = employeeSection(5);
  for (const field of ["bank_name", "account_number", "ifsc_code", "pf_applicable", "uan_number", "pf_member_id", "esi_applicable", "esi_number"]) {
    assert.match(finance, new RegExp(`data-employee-field="${field}"`));
  }
  assert.match(html, /function syncEmployeeBenefitFields\(\)/);
  assert.match(html, /PF-applicable employees require a valid 12-digit UAN/);
  assert.match(html, /ESI-applicable employees require a 10 to 17 digit ESI\/IP number/);
});

test("roster consumers continue reading the unchanged employee preference keys", () => {
  assert.match(html, /defaultShiftId: detail\.default_shift_id \|\| ""/);
  assert.match(html, /preferredWeekOffDay: detail\.preferred_week_off_day \|\| ""/);
  assert.match(html, /shiftPreferenceMode: detail\.shift_preference_mode \|\| ""/);
  assert.match(html, /employees: pageConfig\["employee-master"\]\.rows\.map\(row => \(\{[\s\S]*?record: \{[\s\S]*?employeeRecordDetails/);
});

test("employee address uses a static same-as-present selector and keeps the stored field functional", () => {
  const address = employeeSection(3);
  assert.match(address, /data-employee-field="same_as_present" type="hidden" value="true"/);
  assert.match(address, /data-employee-same-present="true"[^>]*>Yes<\/button>/);
  assert.match(address, /data-employee-same-present="false"[^>]*>No<\/button>/);
  assert.doesNotMatch(address, /<select data-employee-field="same_as_present">/);
  assert.match(html, /function syncEmployeePermanentAddress\(copyPresentAddress = true\)/);
  assert.match(html, /permanentAddress\.disabled = isSame;/);
  assert.match(html, /if \(isSame && copyPresentAddress\) permanentAddress\.value = presentAddress\.value;/);
  assert.match(html, /setEmployeeFieldValue\("same_as_present", button\.dataset\.employeeSamePresent \|\| "true"\);/);
});

test("obsolete face attendance registration is absent from UI and persistence schemas", () => {
  assert.doesNotMatch(html, /Face Attendance Registered/i);
  assert.doesNotMatch(html, /data-employee-field="face_registered"/);
  assert.match(html, /delete detail\.face_registered;/);
  assert.doesNotMatch(sqlSchema, /\bface_registered\b/);
});

test("Emergency is removed from the employee workflow and persistence schemas", () => {
  assert.doesNotMatch(html, /<span class="entity-step-name">Emergency<\/span>/);
  assert.doesNotMatch(html, /<h2 class="form-section-title">Emergency Contact<\/h2>/);
  for (const field of [
    "emergency_contact_name",
    "emergency_relationship",
    "emergency_phone",
    "emergency_alt_phone",
    "emergency_address"
  ]) {
    assert.doesNotMatch(html, new RegExp(`data-employee-field="${field}"`));
    assert.match(html, new RegExp(`delete detail\\.${field};`));
  }
  assert.doesNotMatch(sqlSchema, /employee_emergency_contact/);
  assert.match(html, /data-employee-step="6"[\s\S]*?<span class="entity-step-name">Review<\/span>/);
  assert.match(html, /Step 7 of 7/);
  assert.doesNotMatch(html, /Step \d+ of 10/);
  assert.match(html, /Math\.min\(6, stepIndex\)/);
});

test("employee edit heading identifies the employee being edited", () => {
  assert.match(html, /const employee = isEdit && editingEmployeeId \? employeeDetailById\(editingEmployeeId\) : \{\};/);
  assert.match(html, /const title = isEdit \? `Edit \$\{employeeName\}` : "Add New Employee";/);
  assert.match(html, /\$\("#pageTitle"\)\.textContent = title;/);
  assert.match(html, /setBreadcrumb\(\["HRMS", "Employees", "Employee Master", escapeHtml\(title\)\]\);/);
});

test("Access and Personal Profile are merged with repeatable family details", () => {
  const profile = employeeSection(2);
  assert.match(profile, /<h3>Access<\/h3>/);
  assert.match(profile, /<h3>Personal Profile<\/h3>/);
  assert.match(profile, /class="location-form-grid employee-profile-primary-grid"/);
  for (const field of ["login_id", "role_id", "login_password", "phone", "email", "date_of_birth", "blood_group", "marital_status", "religion", "nationality"]) {
    assert.match(profile, new RegExp(`data-employee-field="${field}"`));
    assert.equal((profile.match(new RegExp(`data-employee-field="${field}"`, "g")) || []).length, 1, `${field} control must appear once in the merged step`);
  }
  assert.match(profile, /id="employeeFamilyList"/);
  assert.match(profile, /id="addEmployeeFamilyMember"/);
  assert.match(profile, /id="employeeSpouseDetails" hidden/);
  assert.doesNotMatch(profile, /guardian_name|spouse_name/);
  assert.match(profile, /data-employee-field="religion"[\s\S]*?<option>Hindu<\/option>[\s\S]*?<option>Prefer not to say<\/option>/);
  assert.match(html, /\.location-form-grid\.employee-profile-primary-grid\s*\{\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
  assert.match(sqlSchema, /CREATE TABLE public\.employee_profile[\s\S]*?religion character varying,/);
  assert.match(sqlSchema, /CREATE TABLE public\.employee_family_members/);
  assert.doesNotMatch(sqlSchema, /\b(?:father_name|mother_name|spouse_name)\b/);
});

test("employee linked datasets are acknowledged by Excel while legacy blob fields are discarded", async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "hrms-employee-workplace-"));
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
  const record = {
    employee_id: "EMP-WORKPLACE-1",
    parent_entity_id: "ENTITY-1",
    location_id: "LOCATION-1",
    department_id: "DEPT-1",
    designation_id: "DESIG-1",
    is_salesperson: "true",
    present_address: "1 Example Road",
    same_as_present: "true",
    permanent_address: "1 Example Road",
    default_shift_id: "SHIFT-CLOSE",
    shift_preference_mode: "Fixed",
    preferred_week_off_day: "6",
    shift_restriction_note: "Avoid split shifts",
    religion: "Hindu",
    aadhaar_number: "123412341234",
    pan_number: "ABCDE1234F",
    primary_skill: "Legacy Skill",
    bank_name: "Legacy Bank",
    uan_number: "100000000001",
    esi_number: "1234567890",
    guardian_name: "Legacy Guardian",
    spouse_name: "Legacy Spouse",
    face_registered: "true",
    emergency_contact_name: "Old Contact",
    emergency_relationship: "Parent",
    emergency_phone: "9999999999",
    emergency_alt_phone: "8888888888",
    emergency_address: "Old Address"
  };
  const snapshot = {
    ...base,
    shift_policies: [{
      policy_id: "SHIFT-CLOSE",
      location_id: "LOCATION-1",
      shift_name: "Closing Shift",
      status: "Active"
    }],
    employees: [{
      employee_id: record.employee_id,
      employee_name: "Workplace Example",
      location: "Location One",
      designation: "Store Manager",
      profile_status: "Continue Setup",
      status: "Active",
      record
    }],
    employee_family_members: [{
      family_member_id: "FM-EMP-WORKPLACE-1-1",
      employee_id: record.employee_id,
      member_name: "Family Example",
      relationship: "Guardian",
      phone_number: "",
      is_spouse: false,
      status: "Active"
    }],
    employee_documents: [
      {
        document_id: "DOC-EMP-WORKPLACE-1-AADHAAR",
        employee_id: record.employee_id,
        document_type: "Aadhaar",
        document_number: "123412341234",
        verification_status: "Pending",
        status: "Active"
      },
      {
        document_id: "DOC-EMP-WORKPLACE-1-PAN",
        employee_id: record.employee_id,
        document_type: "PAN",
        document_number: "ABCDE1234F",
        verification_status: "Verified",
        status: "Active"
      }
    ],
    employee_education: [{
      education_id: "EDU-EMP-WORKPLACE-1",
      employee_id: record.employee_id,
      qualification_level: "Graduate",
      course_name: "B.Com",
      education_status: "Completed"
    }],
    employee_experience: [{
      experience_id: "EXP-EMP-WORKPLACE-1",
      employee_id: record.employee_id,
      employer_name: "Example Retail",
      designation: "Associate",
      years_experience: 2
    }, {
      experience_id: "EXP-EMP-WORKPLACE-2",
      employee_id: record.employee_id,
      employer_name: "Example Services",
      designation: "Supervisor",
      years_experience: 1
    }],
    employee_skills: [{
      skill_id: "SKL-EMP-WORKPLACE-1",
      employee_id: record.employee_id,
      skill_name: "Customer Service",
      skill_level: "Advanced"
    }, {
      skill_id: "SKL-EMP-WORKPLACE-2",
      employee_id: record.employee_id,
      skill_name: "Inventory Control",
      skill_level: "Intermediate"
    }],
    employee_finance_benefits: [{
      finance_benefit_id: "FIN-EMP-WORKPLACE-1",
      employee_id: record.employee_id,
      bank_name: "Example Bank",
      account_number: "0011223344",
      ifsc_code: "ABCD0123456",
      pf_applicable: true,
      uan_number: "100000000001",
      esi_applicable: true,
      esi_number: "1234567890",
      status: "Active"
    }]
  };

  const saved = await fetch(`${baseUrl}/api/mock-db`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "If-Match": base._server_revision },
    body: JSON.stringify(snapshot)
  });
  assert.equal(saved.status, 200);
  const acknowledgement = await saved.json();
  assert.equal(acknowledgement.counts.employees, 1);
  assert.equal(acknowledgement.counts.employee_family_members, 1);
  assert.equal(acknowledgement.counts.employee_documents, 2);
  assert.equal(acknowledgement.counts.employee_education, 1);
  assert.equal(acknowledgement.counts.employee_experience, 2);
  assert.equal(acknowledgement.counts.employee_skills, 2);
  assert.equal(acknowledgement.counts.employee_finance_benefits, 1);

  const reloaded = await (await fetch(`${baseUrl}/api/mock-db`)).json();
  const expectedRecord = { ...record };
  [
    "face_registered",
    "emergency_contact_name",
    "emergency_relationship",
    "emergency_phone",
    "emergency_alt_phone",
    "emergency_address",
    "guardian_name",
    "spouse_name",
    "aadhaar_number",
    "pan_number",
    "primary_skill",
    "bank_name",
    "uan_number",
    "esi_number"
  ].forEach(field => delete expectedRecord[field]);
  expectedRecord.tenant_id = "TEN-INDIPET";
  assert.deepEqual(reloaded.employees[0].record, expectedRecord);
  assert.equal(reloaded.employee_family_members[0].employee_id, record.employee_id);
  assert.equal(reloaded.employee_family_members[0].member_name, "Family Example");
  assert.equal(reloaded.employee_documents.length, 2);
  assert.equal(reloaded.employee_documents.find(row => row.document_type === "Aadhaar").document_number, "123412341234");
  assert.equal(reloaded.employee_education[0].qualification_level, "Graduate");
  assert.equal(reloaded.employee_experience.length, 2);
  assert.deepEqual(reloaded.employee_experience.map(row => row.employer_name).sort(), ["Example Retail", "Example Services"]);
  assert.equal(reloaded.employee_skills.length, 2);
  assert.deepEqual(reloaded.employee_skills.map(row => row.skill_name).sort(), ["Customer Service", "Inventory Control"]);
  assert.equal(reloaded.employee_finance_benefits[0].uan_number, "100000000001");
});
