const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");

test("LOP is a system pay treatment inside the existing leave and attendance layers", () => {
  assert.match(html, /<script src="loss-of-pay-resolver\.cjs"><\/script>/);
  assert.match(html, /leave_code: "LOP",\s*leave_name: "Loss of Pay",\s*system_managed: true,\s*balance_tracked: false/);
  assert.match(html, /\$\{identity\} — no balance · unpaid/);
  assert.match(html, /"Day Status", "Pay Treatment", "Review Status"/);
  assert.match(html, /"Issue", "Pay Treatment", "Final Status"/);
  assert.match(html, /function attendancePayTreatmentForRow/);
});

test("LOP requests and attendance assignments bypass leave balance deduction only", () => {
  assert.match(html, /const isLossOfPay = leaveCode\.toUpperCase\(\) === "LOP"/);
  assert.match(html, /if \(!isLossOfPay && \(!selectedBalance \|\| requestedDays > availableDays\)\)/);
  assert.match(html, /pay_treatment: isLossOfPay \? "LOSS_OF_PAY" : "PAID_LEAVE"/);
  assert.match(html, /balance_effect: isLossOfPay \? "NONE" : "DEDUCT_ON_APPROVAL"/);
  assert.match(html, /const finalStatus = isLossOfPay[\s\S]*?"Absent"[\s\S]*?"On Leave"/);
});

test("Excel API registers and reconciles LOP before every database acknowledgement", () => {
  assert.match(server, /import HrmsLossOfPayResolver from "\.\/loss-of-pay-resolver\.cjs"/);
  assert.match(server, /"units", "pay_treatment", "workflow_status"/);
  assert.match(server, /HrmsLossOfPayResolver\.reconcileEntries\(/);
  assert.match(server, /HrmsLossOfPayResolver\.validateEntries\(/);
});
