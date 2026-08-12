(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsLocationScope = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const normalize = value => text(value).toLowerCase().replace(/\s+/g, " ");
  const array = value => Array.isArray(value) ? value : [];

  function locationTokens(location = {}) {
    return new Set([
      location.id,
      location.location_id,
      location.name,
      location.listName,
      location.location_name
    ].map(normalize).filter(Boolean));
  }

  function selectedLocation(locations = [], filter = "all") {
    const normalizedFilter = normalize(filter);
    if (!normalizedFilter || normalizedFilter === "all") return null;
    return array(locations).find(location => locationTokens(location).has(normalizedFilter)) || null;
  }

  function employeeContext(employeeRows = [], employeeDetails = {}, employeeId = "", employeeName = "") {
    const normalizedId = normalize(employeeId);
    const normalizedName = normalize(employeeName);
    const row = array(employeeRows).find(candidate =>
      (normalizedId && normalize(candidate?.[0]) === normalizedId)
      || (!normalizedId && normalizedName && normalize(candidate?.[1]) === normalizedName)
    ) || [];
    const resolvedId = text(employeeId || row[0]);
    return {
      row,
      details: employeeDetails?.[resolvedId] && typeof employeeDetails[resolvedId] === "object"
        ? employeeDetails[resolvedId]
        : {}
    };
  }

  function rowMatchesLocation({
    filter = "all",
    locations = [],
    row = [],
    source = {},
    employeeRows = [],
    employeeDetails = {}
  } = {}) {
    const normalizedFilter = normalize(filter);
    if (!normalizedFilter || normalizedFilter === "all") return true;

    const details = source?.details && typeof source.details === "object" ? source.details : {};
    const employeeId = text(source.employee_id || details.employee_id);
    const employeeName = text(details.employee_name || source.employee_name || row?.[1]);
    const employee = employeeContext(employeeRows, employeeDetails, employeeId, employeeName);
    const location = selectedLocation(locations, filter);
    const targets = location ? locationTokens(location) : new Set([normalizedFilter]);
    const candidates = [
      source.location_id,
      source.locationId,
      source.location,
      source.location_name,
      details.location_id,
      details.locationId,
      details.location,
      details.location_name,
      details.location_label,
      employee.details.location_id,
      employee.details.locationId,
      employee.details.location,
      employee.details.location_name,
      employee.details.location_label,
      employee.row?.[2],
      ...array(row)
    ].map(normalize).filter(Boolean);

    return candidates.some(candidate => targets.has(candidate));
  }

  return Object.freeze({ locationTokens, normalize, rowMatchesLocation, selectedLocation });
});
