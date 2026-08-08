const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, 'Indipet_HRMS_schema_map_visual.pdf');

const PAGE = { w: 1190, h: 842 };
const margin = 42;

function esc(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

class Canvas {
  constructor() {
    this.ops = [];
  }
  raw(op) { this.ops.push(op); }
  text(x, y, text, size = 10, color = [0.12, 0.12, 0.12], font = 'F1') {
    this.raw(`${color.join(' ')} rg BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(text)}) Tj ET`);
  }
  multiline(x, y, text, size = 9, maxChars = 28, leading = 11, color = [0.2, 0.2, 0.2]) {
    const lines = Array.isArray(text) ? text : wrap(text, maxChars);
    lines.forEach((line, i) => this.text(x, y - i * leading, line, size, color));
    return y - lines.length * leading;
  }
  rect(x, y, w, h, fill = [1, 1, 1], stroke = [0.7, 0.7, 0.7], width = 1) {
    this.raw(`q ${fill.join(' ')} rg ${stroke.join(' ')} RG ${width} w ${x} ${y} ${w} ${h} re B Q`);
  }
  line(x1, y1, x2, y2, color = [0.45, 0.45, 0.45], width = 1) {
    this.raw(`q ${color.join(' ')} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`);
  }
  arrow(x1, y1, x2, y2, color = [0.32, 0.32, 0.32]) {
    this.line(x1, y1, x2, y2, color, 1.1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 7;
    const a1 = angle + Math.PI * 0.82;
    const a2 = angle - Math.PI * 0.82;
    this.line(x2, y2, x2 + Math.cos(a1) * len, y2 + Math.sin(a1) * len, color, 1.1);
    this.line(x2, y2, x2 + Math.cos(a2) * len, y2 + Math.sin(a2) * len, color, 1.1);
  }
  pill(x, y, text, fill, stroke, color = [0.12, 0.12, 0.12]) {
    const w = Math.max(62, text.length * 5.3 + 16);
    this.rect(x, y - 4, w, 18, fill, stroke, 0.8);
    this.text(x + 8, y + 1, text, 8.5, color);
    return w;
  }
  box(x, y, w, h, title, items, fill, stroke, accent) {
    this.rect(x, y, w, h, fill, stroke, 1.1);
    this.rect(x, y + h - 25, w, 25, accent, stroke, 0.8);
    this.text(x + 10, y + h - 17, title, 10.5, [1, 1, 1], 'F2');
    let cursor = y + h - 39;
    for (const item of items) {
      this.text(x + 11, cursor, `- ${item}`, 8.4, [0.18, 0.18, 0.18]);
      cursor -= 12;
    }
  }
  footer(pageNo) {
    this.line(margin, 28, PAGE.w - margin, 28, [0.82, 0.82, 0.82], 0.8);
    this.text(margin, 14, 'Indipet ERP - HRMS Schema Map Visual', 8, [0.36, 0.36, 0.36]);
    this.text(PAGE.w - margin - 46, 14, `Page ${pageNo}`, 8, [0.36, 0.36, 0.36]);
  }
}

function pageOne() {
  const c = new Canvas();
  c.text(margin, 805, 'Indipet ERP - HRMS Schema Map', 24, [0.08, 0.08, 0.08], 'F2');
  c.text(margin, 784, 'Canonical HRMS layer: 37 locked SQL tables across Phase 1-7, plus payroll, CO, commission and FnF views.', 10.5, [0.33, 0.33, 0.33]);
  c.pill(930, 804, 'LOCKED HRMS BASELINE', [0.9, 0.97, 0.93], [0.25, 0.65, 0.35], [0.08, 0.33, 0.14]);
  c.pill(930, 780, 'AUDIT + PERFORMANCE READY', [0.96, 0.94, 1], [0.52, 0.42, 0.75], [0.25, 0.18, 0.42]);

  const cols = [
    { x: 42, y: 610, title: 'Core Registry', accent: [0.17, 0.32, 0.55], fill: [0.94, 0.97, 1], items: ['state_master', 'parent_entity', 'sub_location', 'department_master', 'designation_master', 'role_master', 'employee_master', 'employee_finance'] },
    { x: 228, y: 610, title: 'Policy Layer', accent: [0.13, 0.48, 0.42], fill: [0.93, 0.99, 0.97], items: ['holiday_calendar', 'leave_type_master', 'employee_category_master', 'leave_policy_master', 'policy_variant', 'policy_assignment', 'shift_policy_master', 'payroll_period_master', 'salary_structure_master', 'pt_slab_master', 'minimum_wage_master', 'state_compliance_master'] },
    { x: 414, y: 610, title: 'Capability', accent: [0.43, 0.3, 0.62], fill: [0.97, 0.95, 1], items: ['employee_shift_preference', 'employee_skills', 'skills feed service booking', 'skills feed groomer commission'] },
    { x: 600, y: 610, title: 'Roster + Attendance', accent: [0.72, 0.36, 0.1], fill: [1, 0.96, 0.92], items: ['roster', 'roster_slots', 'roster_history', 'attendance', 'attendance_computation', 'attendance_decision', 'co_ledger', 'v_co_balance', 'v_payroll_input'] },
    { x: 786, y: 610, title: 'Performance', accent: [0.56, 0.27, 0.5], fill: [1, 0.94, 0.99], items: ['sales_target_portfolio', 'store_target_master', 'store_target_slab_config', 'store_pool_hierarchy_config', 'commission_ledger', 'v_commission_payroll'] },
    { x: 972, y: 610, title: 'Payroll + Exit', accent: [0.42, 0.42, 0.18], fill: [1, 0.99, 0.9], items: ['employee_salary', 'gratuity_ledger', 'employee_advances', 'v_fnf_settlement', 'Finance settlement action'] },
  ];
  cols.forEach(col => c.box(col.x, col.y, 166, 150, col.title, col.items, col.fill, [0.73, 0.73, 0.73], col.accent));
  for (let i = 0; i < cols.length - 1; i++) c.arrow(cols[i].x + 166, 690, cols[i + 1].x, 690, [0.38, 0.38, 0.38]);

  c.text(42, 558, 'Anchor Relationships', 15, [0.08, 0.08, 0.08], 'F2');
  const anchorBoxes = [
    { x: 42, y: 422, w: 220, h: 108, title: 'employee_master anchor', items: ['employee -> attendance, leave, roster', 'employee -> payroll and commission', 'employee -> gratuity, advances, FnF', 'date_of_joining is gratuity base'], fill: [0.96, 0.98, 1], accent: [0.17, 0.32, 0.55] },
    { x: 292, y: 422, w: 220, h: 108, title: 'sub_location bridge', items: ['location -> employees', 'location -> shifts and rosters', 'location -> targets and operations', 'Phase 8 audit actor/configurer link'], fill: [0.94, 0.99, 0.97], accent: [0.13, 0.48, 0.42] },
    { x: 542, y: 422, w: 220, h: 108, title: 'attendance decision chain', items: ['attendance -> computation', 'computation -> decision', 'decision final_status is authoritative', 'v_payroll_input feeds payroll'], fill: [1, 0.96, 0.92], accent: [0.72, 0.36, 0.1] },
    { x: 792, y: 422, w: 220, h: 108, title: 'performance chain', items: ['targets -> portfolio', 'portfolio -> commission ledger', 'commission -> payroll variable', 'POS/order links deferred'], fill: [1, 0.94, 0.99], accent: [0.56, 0.27, 0.5] },
  ];
  anchorBoxes.forEach(b => c.box(b.x, b.y, b.w, b.h, b.title, b.items, b.fill, [0.76, 0.76, 0.76], b.accent));
  c.arrow(262, 476, 292, 476, [0.4, 0.4, 0.4]);
  c.arrow(512, 476, 542, 476, [0.4, 0.4, 0.4]);
  c.arrow(762, 476, 792, 476, [0.4, 0.4, 0.4]);

  c.text(42, 366, 'External Master / Action Links', 15, [0.08, 0.08, 0.08], 'F2');
  const links = [
    ['Item Master', 'sales_target_portfolio future item, brand and category FKs'],
    ['Order / POS', 'commission_ledger future pos_transaction_id and pos_line_item_id'],
    ['Service Operations', 'employee_skills controls service booking eligibility'],
    ['Finance', 'v_payroll_input, v_commission_payroll, gratuity, advances and FnF'],
    ['Permission System', 'role access should gate HR Admin, Store Admin and Employee views'],
    ['Location Audit', 'location_audit_log stores actor/configuration changes'],
  ];
  let y = 335;
  links.forEach(([a, b], i) => {
    const x = i % 2 === 0 ? 42 : 600;
    if (i % 2 === 0 && i > 0) y -= 48;
    c.rect(x, y - 16, 510, 34, [0.985, 0.985, 0.985], [0.82, 0.82, 0.82], 0.8);
    c.text(x + 12, y + 2, a, 10, [0.12, 0.12, 0.12], 'F2');
    c.text(x + 138, y + 2, b, 9, [0.32, 0.32, 0.32]);
  });

  c.text(42, 172, 'Audit Focus For Developer Build', 15, [0.08, 0.08, 0.08], 'F2');
  const audit = [
    'Verify table names and FKs against canonical HRMS schema, not simplified prototype names.',
    'Separate attendance measurement from attendance decision; payroll must read the decision layer.',
    'Avoid simulated roster/leave automation paths; all writes must match real table columns and FKs.',
    'RLS must be scoped by role and location, not broad authenticated access.',
  ];
  c.multiline(58, 146, audit.map((v, i) => `${i + 1}. ${v}`), 10, 120, 15, [0.2, 0.2, 0.2]);
  c.footer(1);
  return c.ops.join('\n');
}

function table(c, x, y, widths, rows, rowH = 24) {
  rows.forEach((row, r) => {
    let cursor = x;
    const fill = r === 0 ? [0.16, 0.16, 0.16] : (r % 2 ? [0.98, 0.98, 0.98] : [1, 1, 1]);
    row.forEach((cell, i) => {
      c.rect(cursor, y - rowH, widths[i], rowH, fill, [0.82, 0.82, 0.82], 0.6);
      c.multiline(cursor + 7, y - 14, cell, r === 0 ? 8.8 : 8, Math.floor(widths[i] / 5.2), 9.5, r === 0 ? [1, 1, 1] : [0.18, 0.18, 0.18]);
      cursor += widths[i];
    });
    y -= rowH;
  });
  return y;
}

function pageTwo() {
  const c = new Canvas();
  c.text(margin, 805, 'HRMS Table Coverage And Audit Nodes', 22, [0.08, 0.08, 0.08], 'F2');
  c.text(margin, 784, 'Grouped view for project audit, performance audit, and implementation reconciliation.', 10.5, [0.33, 0.33, 0.33]);

  const rows = [
    ['Group', 'Tables / Views', 'Audit Meaning'],
    ['Core employee registry', 'state_master, parent_entity, sub_location, department_master, designation_master, role_master, employee_master, employee_finance', 'Employee identity, entity routing, reporting manager, access role and sensitive finance split.'],
    ['Leave, shift, compliance, payroll policy', 'holiday_calendar, leave_type_master, employee_category_master, leave_policy_master, policy_variant, policy_assignment, shift_policy_master, pt_slab_master, minimum_wage_master, payroll_period_master, salary_structure_master, state_compliance_master', 'Configuration layer. Business rules must be data-driven and not hardcoded in UI.'],
    ['Preferences and capability', 'employee_shift_preference, employee_skills', 'Roster constraints, service eligibility and groomer commission eligibility.'],
    ['Roster and attendance', 'roster, roster_slots, roster_history, attendance, co_ledger, attendance_computation, attendance_decision, v_co_balance, v_payroll_input', 'Operational proof of work and authoritative payable unit calculation.'],
    ['Performance and incentives', 'sales_target_portfolio, store_target_master, store_target_slab_config, store_pool_hierarchy_config, commission_ledger, v_commission_payroll', 'Project performance, sales incentives, store pool and payout audit trail.'],
    ['Salary, gratuity, advances, exit', 'employee_salary, gratuity_ledger, employee_advances, v_fnf_settlement', 'Payroll liability, statutory settlement, salary advance recovery and FnF controls.'],
  ];
  table(c, 42, 746, [170, 610, 340], rows, 52);

  c.text(42, 340, 'Critical Flow Checks', 15, [0.08, 0.08, 0.08], 'F2');
  const checks = [
    ['Flow', 'Expected Chain'],
    ['Payroll input', 'attendance -> attendance_computation -> attendance_decision -> v_payroll_input -> payroll run'],
    ['CO balance', 'attendance_decision CO event -> co_ledger rows -> v_co_balance; never store CO as a single integer balance'],
    ['Commission', 'sales_target_portfolio/store targets -> commission_ledger -> v_commission_payroll -> payroll variable'],
    ['FnF', 'employee_master date_of_exit -> gratuity_ledger + employee_advances + commission + unresolved attendance -> v_fnf_settlement'],
    ['Service staffing', 'employee_skills + roster_slots determine who can perform a service; designation alone is not enough'],
  ];
  table(c, 42, 314, [180, 940], checks, 34);

  c.text(42, 95, 'Legend', 11, [0.08, 0.08, 0.08], 'F2');
  c.text(110, 95, 'Solid arrows: required FK/flow. Deferred references: expected future links to Item, POS/Order, Payroll Engine and Finance.', 9, [0.3, 0.3, 0.3]);
  c.footer(2);
  return c.ops.join('\n');
}

function makePdf(pages) {
  const objects = [];
  function add(obj) {
    objects.push(obj);
    return objects.length;
  }

  const font1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const font2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = [];
  const contentIds = [];

  pages.forEach(content => {
    const stream = Buffer.from(content, 'utf8');
    const id = add(`<< /Length ${stream.length} >>\nstream\n${content}\nendstream`);
    contentIds.push(id);
  });

  const pagesId = objects.length + pages.length + 1;
  pages.forEach((_, i) => {
    const page = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    pageIds.push(add(page));
  });

  add(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

fs.writeFileSync(outPath, makePdf([pageOne(), pageTwo()]));
console.log(outPath);
