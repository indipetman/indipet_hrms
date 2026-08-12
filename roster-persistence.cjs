(function attachRosterPersistence(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HrmsRosterPersistence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRosterPersistence() {
  const putJson = async (request, url, body, { expectedRevision = "" } = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (expectedRevision) headers["If-Match"] = expectedRevision;
    const response = await request(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body)
    });
    let payload = null;
    if (typeof response?.json === "function") {
      try { payload = await response.json(); } catch {}
    }
    return {
      ok: response?.ok === true,
      status: Number(response?.status || 0),
      payload
    };
  };

  const atomicWriteAcknowledgesTables = ({ result, snapshot, tables }) => {
    if (!result?.ok) return false;
    const requestedTables = (Array.isArray(tables) ? tables : [])
      .filter(table => Array.isArray(snapshot?.[table]));
    if (!requestedTables.length) return true;
    const counts = result.payload?.counts;
    if (!counts || typeof counts !== "object" || Array.isArray(counts)) return false;
    return requestedTables.every(table =>
      Object.prototype.hasOwnProperty.call(counts, table)
      && Number(counts[table]) === snapshot[table].length
    );
  };

  const isDefinitiveValidationRejection = result => {
    const status = Number(result?.status || 0);
    return status >= 400 && status < 500
      && Boolean(String(result?.payload?.table || "").trim())
      && Array.isArray(result?.payload?.blockers)
      && result.payload.blockers.length > 0;
  };

  const persistSnapshot = async ({
    snapshot,
    baseUrl,
    tables = [],
    expectedRevision = "",
    onRevision = null,
    onResult = null,
    request = globalThis.fetch
  }) => {
    const finish = (target, result = null) => {
      if (typeof onResult === "function") onResult({
        target,
        status: Number(result?.status || 0),
        payload: result?.payload || null
      });
      return target;
    };
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      return finish("browser", { status: 0, payload: { error: "Expected an HRMS snapshot object." } });
    }
    if (typeof request !== "function" || !baseUrl) {
      return finish("browser", { status: 0, payload: { error: "The HRMS Excel API is unavailable." } });
    }

    let atomicResult = null;
    try {
      atomicResult = await putJson(request, baseUrl, snapshot, { expectedRevision });
      const result = atomicResult;
      if (atomicWriteAcknowledgesTables({ result, snapshot, tables })) {
        if (typeof onRevision === "function" && result.payload?.revision) onRevision(String(result.payload.revision));
        return finish("excel", result);
      }
    } catch (error) {
      atomicResult = { ok: false, status: 0, payload: { error: String(error?.message || "The HRMS Excel API is unavailable.") } };
    }

    // Compatibility path for an already-running older mock server that supports
    // per-table writes but not the newer atomic database-snapshot endpoint.
    // A validation response from the current endpoint must fail closed. Falling
    // back after a 409 can partially write earlier tables before a later table
    // rejects the same invalid snapshot.
    const compatibilityFallbackAllowed = !atomicResult
      || [0, 404, 405, 501].includes(atomicResult.status)
      || (atomicResult.ok && atomicResult.status >= 200 && atomicResult.status < 300);
    if (!compatibilityFallbackAllowed) return finish("browser", atomicResult);
    try {
      const tableNames = tables.filter(table => Array.isArray(snapshot[table]));
      if (!tableNames.length) return finish("browser", atomicResult);
      for (const table of tableNames) {
        const result = await putJson(request, `${baseUrl}/${encodeURIComponent(table)}`, snapshot[table]);
        if (!result.ok) return finish("browser", result);
      }
      return finish("excel", { status: 200, payload: { ok: true, compatibility: true } });
    } catch (error) {
      return finish("browser", { status: 0, payload: { error: String(error?.message || "The HRMS Excel API is unavailable.") } });
    }
  };

  const employeeBundleTables = Object.freeze([
    "employees",
    "employee_family_members",
    "employee_documents",
    "employee_education",
    "employee_experience",
    "employee_skills",
    "employee_finance_benefits"
  ]);

  const mergeEmployeeBundle = ({ latest, snapshot, employeeId, tables = [] }) => {
    const normalizedId = String(employeeId || "").trim();
    const requestedTables = Array.isArray(tables) ? tables : [];
    const merged = {};
    for (const table of requestedTables) {
      const latestRows = Array.isArray(latest?.[table]) ? latest[table] : [];
      if (!employeeBundleTables.includes(table)) {
        merged[table] = latestRows;
        continue;
      }
      const desiredRows = (Array.isArray(snapshot?.[table]) ? snapshot[table] : [])
        .filter(row => String(row?.employee_id || "").trim() === normalizedId);
      merged[table] = [
        ...latestRows.filter(row => String(row?.employee_id || "").trim() !== normalizedId),
        ...desiredRows
      ];
    }
    return merged;
  };

  const persistEmployeeBundle = async ({
    snapshot,
    employeeId,
    baseUrl,
    tables = [],
    onRevision = null,
    request = globalThis.fetch
  }) => {
    const normalizedId = String(employeeId || "").trim();
    if (!normalizedId || !snapshot || typeof request !== "function" || !baseUrl) return "browser";
    try {
      const latestResponse = await request(baseUrl, { cache: "no-store" });
      if (latestResponse?.ok !== true || typeof latestResponse.json !== "function") return "browser";
      const latest = await latestResponse.json();
      const latestRevision = String(latest?._server_revision || "").trim();
      if (!latestRevision) return "browser";
      const merged = mergeEmployeeBundle({ latest, snapshot, employeeId: normalizedId, tables });
      const result = await putJson(request, baseUrl, merged, { expectedRevision: latestRevision });
      if (!atomicWriteAcknowledgesTables({ result, snapshot: merged, tables })) return "browser";
      if (typeof onRevision === "function" && result.payload?.revision) onRevision(String(result.payload.revision));
      return "excel";
    } catch {
      return "browser";
    }
  };

  const deleteRoster = async ({ rosterId, baseUrl, request = globalThis.fetch }) => {
    const normalizedId = String(rosterId || "").trim();
    if (!normalizedId || !baseUrl || typeof request !== "function") {
      return { target: "browser", status: 0, payload: null };
    }
    try {
      const response = await request(`${baseUrl}/rosters/${encodeURIComponent(normalizedId)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      let payload = null;
      if (typeof response?.json === "function") {
        try { payload = await response.json(); } catch {}
      }
      const acknowledged = response?.ok === true
        && payload?.ok === true
        && payload?.table === "rosters"
        && String(payload?.deleted_id || "") === normalizedId
        && Number.isInteger(Number(payload?.count));
      return {
        target: acknowledged ? "excel" : "browser",
        status: Number(response?.status || 0),
        payload
      };
    } catch {
      return { target: "browser", status: 0, payload: null };
    }
  };

  const pendingSnapshot = stored => {
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return null;
    if (stored._sync?.pending_server_sync !== true) return null;
    if (!String(stored._sync?.server_revision || "").trim()) return null;
    const { _sync, ...snapshot } = stored;
    return {
      snapshot,
      revision: String(_sync.revision || ""),
      serverRevision: String(_sync.server_revision || "")
    };
  };

  return {
    atomicWriteAcknowledgesTables,
    deleteRoster,
    employeeBundleTables,
    isDefinitiveValidationRejection,
    mergeEmployeeBundle,
    pendingSnapshot,
    persistEmployeeBundle,
    persistSnapshot
  };
});
