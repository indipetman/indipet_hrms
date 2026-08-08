"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RELEASE_MARKER_NAME = ".indipet-production-release.json";
const RELEASE_TYPE = "indipet-erp-hrms-production";

const productionMode = (env = process.env) => {
  const value = String(env.INDIPET_RUNTIME_MODE || env.NODE_ENV || "").trim().toLowerCase();
  return value === "production" || value === "prod";
};

const pathIsWithin = (candidate, parent) => {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const readReleaseMarker = releaseRoot => {
  const markerPath = path.join(releaseRoot, RELEASE_MARKER_NAME);
  if (!fs.existsSync(markerPath)) {
    throw new Error(
      `Production startup is blocked: ${RELEASE_MARKER_NAME} is missing. `
      + "Run the allowlisted production release builder and deploy that release directory."
    );
  }
  let marker;
  try {
    marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  } catch {
    throw new Error(`Production startup is blocked: ${RELEASE_MARKER_NAME} is invalid.`);
  }
  if (marker?.release_type !== RELEASE_TYPE || marker?.schema_version !== 1) {
    throw new Error(`Production startup is blocked: ${RELEASE_MARKER_NAME} is not an approved release marker.`);
  }
  return { marker, markerPath };
};

const assertProductionRuntime = ({
  appName,
  appDir,
  databasePaths = [],
  allowedDatabaseNames = [],
  env = process.env
}) => {
  if (!productionMode(env)) return { production: false };

  const releaseRoot = path.resolve(appDir, "..");
  const { marker, markerPath } = readReleaseMarker(releaseRoot);
  if (!Array.isArray(marker.apps) || !marker.apps.includes(appName)) {
    throw new Error(`Production startup is blocked: ${appName} is not registered in the release marker.`);
  }

  const configuredDataRoot = String(env.INDIPET_PRODUCTION_DATA_ROOT || "").trim();
  const permittedRoots = [path.resolve(appDir)];
  if (configuredDataRoot) permittedRoots.push(path.resolve(configuredDataRoot));

  for (const databasePath of databasePaths) {
    if (!permittedRoots.some(root => pathIsWithin(databasePath, root))) {
      throw new Error(
        `Production startup is blocked: database path ${path.resolve(databasePath)} is outside the release `
        + "and INDIPET_PRODUCTION_DATA_ROOT."
      );
    }
    if (path.resolve(databasePath).split(path.sep).some(segment => segment.toLowerCase() === "backups")) {
      throw new Error("Production startup is blocked: a backup workbook cannot be selected as an active database.");
    }
    if (allowedDatabaseNames.length && !allowedDatabaseNames.includes(path.basename(databasePath))) {
      throw new Error(`Production startup is blocked: ${path.basename(databasePath)} is not an approved active database name.`);
    }
  }

  if (appName === "indipet_hrms" && env.HRMS_REQUIRE_ERP_CORE === "0") {
    throw new Error("Production startup is blocked: HRMS_REQUIRE_ERP_CORE=0 is test-only.");
  }

  return { production: true, releaseRoot, markerPath, marker };
};

const bootstrapCredentials = (env = process.env) => ({
  userId: String(env.INDIPET_BOOTSTRAP_USER_ID || "").trim(),
  password: String(env.INDIPET_BOOTSTRAP_PASSWORD || "")
});

const validateBootstrapCredentials = (env = process.env) => {
  const credentials = bootstrapCredentials(env);
  if (!credentials.userId || !credentials.password) {
    return {
      ok: false,
      error: "First-run ERP access is not configured. Set INDIPET_BOOTSTRAP_USER_ID and INDIPET_BOOTSTRAP_PASSWORD on the server."
    };
  }
  if (credentials.password.length < 12) {
    return { ok: false, error: "INDIPET_BOOTSTRAP_PASSWORD must contain at least 12 characters." };
  }
  const normalized = credentials.password.trim().toLowerCase();
  if (["admin", "password", "123456", credentials.userId.toLowerCase()].includes(normalized)) {
    return { ok: false, error: "INDIPET_BOOTSTRAP_PASSWORD is too weak for first-run access." };
  }
  return { ok: true, credentials };
};

module.exports = {
  RELEASE_MARKER_NAME,
  RELEASE_TYPE,
  assertProductionRuntime,
  bootstrapCredentials,
  pathIsWithin,
  productionMode,
  validateBootstrapCredentials
};
