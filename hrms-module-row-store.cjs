(function attachHrmsModuleRowStore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HrmsModuleRowStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHrmsModuleRowStore() {
  const normalizeKeyPart = value => String(value || "").trim().toLowerCase();

  const moduleRowCells = record => Array.isArray(record?.cells) ? record.cells : [];

  const moduleLogicalKey = (pageKey, source = {}, cells = moduleRowCells(source)) => {
    const details = source.details && typeof source.details === "object" ? source.details : {};

    if (pageKey === "attendance-list") {
      const employeeId = details.employee_id || source.employee_id || cells[2];
      const workDate = details.work_date || source.work_date || cells[0];
      if (employeeId && workDate) {
        return `${pageKey}:day:${normalizeKeyPart(employeeId)}:${normalizeKeyPart(workDate)}`;
      }
    }

    const explicitKey = source.logical_key
      || source.request_id
      || source.record_id
      || details.logical_key
      || details.request_id
      || details.record_id;
    if (explicitKey) return `${pageKey}:record:${normalizeKeyPart(explicitKey)}`;

    if (pageKey === "department-master") {
      const code = details.department_code || source.department_code || cells[0];
      if (code) return `${pageKey}:code:${normalizeKeyPart(code)}`;
      const name = details.department_name || source.department_name || cells[1];
      return name ? `${pageKey}:name:${normalizeKeyPart(name)}` : "";
    }

    if (pageKey === "designation-master") {
      const code = details.designation_code || source.designation_code || cells[0];
      if (code) return `${pageKey}:code:${normalizeKeyPart(code)}`;
      const name = details.designation_name || source.designation_name || cells[1];
      const department = details.department_code_or_name || source.department || cells[2];
      return name
        ? `${pageKey}:name:${normalizeKeyPart(department)}:${normalizeKeyPart(name)}`
        : "";
    }

    if (pageKey === "leave-requests" && cells[0]) {
      return `${pageKey}:request:${normalizeKeyPart(cells[0])}`;
    }

    return "";
  };

  const dedupeModuleRows = rows => {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : []).filter(record => {
      const pageKey = String(record?.pageKey || "");
      const key = moduleLogicalKey(pageKey, record, moduleRowCells(record));
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const mergeModuleRows = (hrmsRows, erpRows) => dedupeModuleRows([
    ...(Array.isArray(hrmsRows) ? hrmsRows : []).filter(record => record?.pageKey !== "role-manager"),
    ...(Array.isArray(erpRows) ? erpRows : []).filter(record => record?.pageKey === "role-manager")
  ]);

  return { dedupeModuleRows, mergeModuleRows, moduleLogicalKey };
});
