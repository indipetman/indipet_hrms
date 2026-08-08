(function attachRolePermissionResolver(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HrmsRolePermissionResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRolePermissionResolver() {
  const actionNames = new Map([
    ["view", "VIEW"],
    ["create", "CREATE"],
    ["edit", "EDIT"],
    ["delete", "DELETE"],
    ["export", "EXPORT"]
  ]);

  const normalizeCode = value => String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "")
    .replace(/_{2,}/g, "_")
    .replace(/-{2,}/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");

  const permissionCodesFromMatrix = permissions => {
    const codes = [];
    let hasActionMatrix = false;
    if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
      return { codes, hasActionMatrix };
    }
    Object.entries(permissions).forEach(([moduleName, submodules]) => {
      if (!submodules || typeof submodules !== "object" || Array.isArray(submodules)) return;
      Object.entries(submodules).forEach(([layerName, actions]) => {
        if (!actions || typeof actions !== "object" || Array.isArray(actions)) return;
        Object.entries(actions).forEach(([actionName, allowed]) => {
          const actionCode = actionNames.get(String(actionName || "").trim().toLowerCase());
          if (!actionCode) return;
          hasActionMatrix = true;
          if (allowed === true) {
            codes.push([normalizeCode(moduleName), normalizeCode(layerName), actionCode].join("."));
          }
        });
      });
    });
    return { codes: [...new Set(codes)], hasActionMatrix };
  };

  const effectivePermissionCodes = (record = {}, permissions = {}) => {
    const matrixResult = permissionCodesFromMatrix(permissions);
    if (matrixResult.hasActionMatrix) return matrixResult.codes;
    return [...new Set([
      ...(Array.isArray(record.permission_codes) ? record.permission_codes : []),
      ...(Array.isArray(record.permissionCodes) ? record.permissionCodes : []),
      ...(Array.isArray(permissions?.permission_codes) ? permissions.permission_codes : []),
      ...(Array.isArray(permissions?.permissionCodes) ? permissions.permissionCodes : []),
      ...(Array.isArray(permissions?.codes) ? permissions.codes : [])
    ].map(value => String(value || "").trim().toUpperCase()).filter(Boolean))];
  };

  return { effectivePermissionCodes, normalizeCode, permissionCodesFromMatrix };
});
