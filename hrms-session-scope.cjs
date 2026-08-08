(function attachHrmsSessionScope(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HrmsSessionScope = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHrmsSessionScope() {
  const adminRoleIds = new Set(["ADM0001", "SYSTEM_ADMIN", "ADMIN"]);
  const tokens = value => String(value || "")
    .split(/[,;|]/)
    .map(item => item.trim())
    .filter(Boolean);

  const fromSession = (session = {}) => {
    const roleId = String(session.role_id || session.role_code || "").trim().toUpperCase();
    const unrestricted = Boolean(session.is_system_admin || adminRoleIds.has(roleId));
    const entityAccess = tokens(session.access_entity_id);
    const locationAccess = tokens(session.access_location_id);
    const allEntities = unrestricted || entityAccess.some(value => value.toUpperCase() === "ALL_ENTITIES");
    const allMappedLocations = unrestricted || !locationAccess.length || locationAccess.some(value =>
      ["ALL_MAPPED", "ALL_LOCATIONS"].includes(value.toUpperCase())
    );
    const entityIds = new Set((entityAccess.length && !allEntities ? entityAccess : [session.entity_id]).filter(Boolean));
    const locationIds = new Set(allMappedLocations ? [] : locationAccess);
    return { unrestricted, allEntities, allMappedLocations, entityIds, locationIds };
  };

  const entityAllowed = (entityId, scope) => Boolean(
    scope?.unrestricted
    || scope?.allEntities
    || (entityId && scope?.entityIds?.has(String(entityId)))
  );

  const locationAllowed = (location = {}, scope) => Boolean(
    entityAllowed(location.parentCode || location.parent_entity_id, scope)
    && (scope?.unrestricted || scope?.allMappedLocations || scope?.locationIds?.has(String(location.id || location.location_id || "")))
  );

  const employeeAllowed = ({ employee = {}, locations = [], scope } = {}) => {
    if (scope?.unrestricted) return true;
    const locationId = employee.location_id || "";
    const locationLabel = employee.location_label || employee.location || "";
    const location = locations.find(item =>
      String(item.id || "") === String(locationId)
      || [item.listName, item.name].some(value => value && String(value) === String(locationLabel))
    );
    const entityId = employee.parent_entity_id || employee.entity_id || location?.parentCode || "";
    if (!entityAllowed(entityId, scope)) return false;
    if (location) return locationAllowed(location, scope);
    if (locationId && !scope?.allMappedLocations) return scope?.locationIds?.has(String(locationId));
    return Boolean(entityId);
  };

  const normalizedValue = value => String(value || "").trim().toLowerCase();

  const recordValues = record => {
    const details = record?.details && typeof record.details === "object" ? record.details : {};
    return [
      ...(Array.isArray(record?.cells) ? record.cells : []),
      ...Object.values(record || {}).filter(value => typeof value !== "object"),
      ...Object.values(details).filter(value => typeof value !== "object")
    ].map(normalizedValue).filter(Boolean);
  };

  const explicitValue = (record, keys) => {
    const details = record?.details && typeof record.details === "object" ? record.details : {};
    for (const key of keys) {
      const value = record?.[key] || details[key];
      if (String(value || "").trim()) return String(value).trim();
    }
    return "";
  };

  const resolveRecordContext = ({ record = {}, employees = [], locations = [] } = {}) => {
    const values = recordValues(record);
    const joinedValues = values.join(" ");
    const explicitEmployeeId = explicitValue(record, ["employee_id", "employeeId"]);
    const explicitLocationId = explicitValue(record, ["location_id", "locationId"]);
    const explicitEntityId = explicitValue(record, ["parent_entity_id", "entity_id", "entityId"]);

    const employee = (Array.isArray(employees) ? employees : []).find(item => {
      const id = String(item.employee_id || item.id || "").trim();
      const name = normalizedValue(item.employee_name || item.name);
      if (explicitEmployeeId && id === explicitEmployeeId) return true;
      if (id && joinedValues.includes(normalizedValue(id))) return true;
      return Boolean(name && values.includes(name));
    }) || null;

    const employeeLocationId = employee?.location_id || employee?.locationId || "";
    const employeeLocationLabel = employee?.location_label || employee?.location || "";
    const location = (Array.isArray(locations) ? locations : []).find(item => {
      const id = String(item.id || item.location_id || "").trim();
      const labels = [item.listName, item.name].map(normalizedValue).filter(Boolean);
      if (explicitLocationId && id === explicitLocationId) return true;
      if (employeeLocationId && id === String(employeeLocationId)) return true;
      if (id && joinedValues.includes(normalizedValue(id))) return true;
      if (employeeLocationLabel && labels.includes(normalizedValue(employeeLocationLabel))) return true;
      return labels.some(label => values.includes(label));
    }) || null;

    const entityId = explicitEntityId
      || employee?.parent_entity_id
      || employee?.entity_id
      || location?.parentCode
      || location?.parent_entity_id
      || "";

    return {
      employee,
      employeeId: explicitEmployeeId || employee?.employee_id || employee?.id || "",
      location,
      locationId: explicitLocationId || location?.id || location?.location_id || employeeLocationId || "",
      entityId
    };
  };

  const recordAllowed = ({ record = {}, policy = "entity", employees = [], locations = [], scope } = {}) => {
    if (scope?.unrestricted || policy === "global") return true;
    const context = resolveRecordContext({ record, employees, locations });
    if (policy === "employee") {
      return Boolean(context.employee && employeeAllowed({ employee: context.employee, locations, scope }));
    }
    if (policy === "location") {
      if (context.location) return locationAllowed(context.location, scope);
      return Boolean(context.employee && employeeAllowed({ employee: context.employee, locations, scope }));
    }
    if (context.entityId) return entityAllowed(context.entityId, scope);
    if (context.location) return locationAllowed(context.location, scope);
    if (context.employee) return employeeAllowed({ employee: context.employee, locations, scope });
    return false;
  };

  return { employeeAllowed, entityAllowed, fromSession, locationAllowed, recordAllowed, resolveRecordContext };
});
