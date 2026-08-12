(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.HrmsLeavePolicyRuleValidator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => String(value ?? "").trim();
  const safeArray = value => Array.isArray(value) ? value : [];

  function normalizeLeaveCode(value = "") {
    return text(value).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  }

  function validateUniqueLeaveCodes(snapshot = {}) {
    const policies = new Map(safeArray(snapshot.leave_policies).map(policy => [text(policy.policy_id), policy]));
    const grouped = new Map();
    safeArray(snapshot.leave_policy_rules).forEach((rule, index) => {
      const code = normalizeLeaveCode(rule?.leave_code);
      if (!code) return;
      const policyId = text(rule?.policy_id);
      const policy = policies.get(policyId) || {};
      const entry = {
        code,
        rule_id: text(rule?.rule_id) || `leave-rule-${index + 1}`,
        policy_id: policyId,
        policy_name: text(policy.policy_name || policy.policy_code || policyId || "Leave Policy")
      };
      if (!grouped.has(code)) grouped.set(code, []);
      grouped.get(code).push(entry);
    });

    const blockers = [];
    grouped.forEach((entries, code) => {
      if (entries.length < 2) return;
      const policyNames = [...new Set(entries.map(entry => entry.policy_name).filter(Boolean))];
      const detail = policyNames.length === 1
        ? `${code} is used more than once in ${policyNames[0]}. Leave codes must be unique.`
        : `${code} already exists in ${policyNames.join(", ")}. Leave codes must be unique across Leave Policy.`;
      blockers.push({
        type: "Duplicate Leave Code",
        status: "Blocked",
        leave_code: code,
        rule_ids: entries.map(entry => entry.rule_id),
        policy_ids: [...new Set(entries.map(entry => entry.policy_id).filter(Boolean))],
        policy_names: policyNames,
        detail
      });
    });

    return blockers.length
      ? { ok: false, error: "Duplicate Leave Type codes are not allowed.", blockers, table: "leave_policy_rules" }
      : { ok: true, blockers: [], table: "leave_policy_rules" };
  }

  return { normalizeLeaveCode, validateUniqueLeaveCodes };
});
