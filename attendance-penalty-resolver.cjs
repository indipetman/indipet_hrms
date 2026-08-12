(function attachAttendancePenaltyResolver(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AttendancePenaltyResolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createAttendancePenaltyResolver() {
  "use strict";

  const ACTIVE_TRANSACTION_STATUSES = new Set(["APPLIED", "MANUAL_REVIEW", "PAYROLL_APPLIED", "REVERSAL_PENDING"]);
  const FINAL_ATTENDANCE_WORKFLOWS = new Set(["APPROVED", "AUTO_APPROVED", "OVERRIDDEN"]);
  const CONSEQUENCE_TYPES = new Set(["WARNING", "LEAVE_DEDUCTION", "LOSS_OF_PAY", "MANUAL_REVIEW"]);
  const WINDOW_TYPES = new Set(["CALENDAR_WEEK", "CALENDAR_MONTH", "CALENDAR_QUARTER", "CALENDAR_YEAR", "ROLLING_DAYS"]);
  const FALLBACK_ACTIONS = new Set(["LOSS_OF_PAY", "MANUAL_REVIEW", "SKIP"]);
  const WARNING_NOTIFICATION_SOURCE = "ATTENDANCE_WARNING";

  const array = value => Array.isArray(value) ? value : [];
  const text = value => String(value ?? "").trim();
  const upper = value => text(value).toUpperCase().replace(/[\s-]+/g, "_");
  const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const roundUnits = value => Math.round(Math.max(0, number(value)) * 2) / 2;
  const normalizeDate = value => {
    const raw = text(value);
    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return raw;
    match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
  };
  const detailsOf = row => row?.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details : {};
  const cellsOf = row => array(row?.cells);
  const safe = value => text(value).replace(/[^A-Za-z0-9_-]/g, "-");
  const fnv1a = value => {
    let hash = 2166136261;
    for (const character of text(value)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  function incidentCode(value = "") {
    const normalized = upper(value);
    const aliases = {
      LATE: "LATE_ARRIVAL",
      LATE_ARRIVAL: "LATE_ARRIVAL",
      EARLY: "EARLY_EXIT",
      EARLY_EXIT: "EARLY_EXIT",
      MISSING_PUNCH: "MISSING_PUNCH",
      ABSENT: "ABSENCE",
      ABSENCE: "ABSENCE",
      NO_SHOW: "ABSENCE",
      HALF_DAY: "HALF_DAY",
      HALF_DAY_WORKING_HOURS: "HALF_DAY",
      OVERTIME: "OVERTIME",
      UNSCHEDULED_WORK: "UNSCHEDULED_WORK",
      SHIFT_MISMATCH: "SHIFT_MISMATCH",
      WEEKLY_OFF_WORK: "WEEKLY_OFF_WORK"
    };
    return aliases[normalized] || normalized;
  }

  function attendanceEvents(snapshot = {}) {
    const tableById = new Map(array(snapshot.attendance).map(row => [text(row.id), row]));
    return array(snapshot.module_rows)
      .filter(row => text(row.pageKey || row.page_key) === "attendance-list")
      .flatMap(row => {
        const details = detailsOf(row);
        const cells = cellsOf(row);
        const attendanceId = text(details.record_id || row.record_id || row.row_id || row.id);
        const tableRow = tableById.get(attendanceId) || {};
        const workflow = upper(details.lifecycle_status || details.decision_status || details.review_status || tableRow.status);
        if (!FINAL_ATTENDANCE_WORKFLOWS.has(workflow) && details.override_active !== true) return [];
        const employeeId = text(details.employee_id || tableRow.employee_id || cells[2]);
        const workDate = normalizeDate(details.work_date || tableRow.work_date || cells[0]);
        const policyId = text(details.applied_policy_id || details.policy_id || tableRow.policy_id);
        if (!attendanceId || !employeeId || !workDate || !policyId) return [];
        const rawIncidents = details.override_active === true
          ? array(details.override_incidents)
          : [
              ...array(details.calculated_timing_incidents || details.timing_incidents),
              details.calculated_timing_issue || details.issue || tableRow.issue,
              details.final_status || details.calculated_day_status || tableRow.status
            ];
        const incidents = [...new Set(rawIncidents
          .flatMap(value => text(value).split(/\s*\/\s*/))
          .map(incidentCode)
          .filter(code => code && !["NONE", "PRESENT", "APPROVED", "PENDING_REVIEW"].includes(code)))];
        return incidents.map(code => ({
          attendance_id: attendanceId,
          employee_id: employeeId,
          employee_name: text(details.employee_name || tableRow.name || cells[1] || employeeId),
          entity_id: text(details.entity_id || tableRow.entity_id),
          location_id: text(details.location_id || tableRow.location_id),
          work_date: workDate,
          policy_id: policyId,
          incident_code: code
        }));
      });
  }

  function isoWeekKey(dateValue) {
    const date = new Date(`${normalizeDate(dateValue)}T00:00:00Z`);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function calendarPeriodKey(dateValue, windowType = "CALENDAR_MONTH") {
    const date = normalizeDate(dateValue);
    if (!date) return "";
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    if (windowType === "CALENDAR_WEEK") return isoWeekKey(date);
    if (windowType === "CALENDAR_QUARTER") return `${year}-Q${Math.ceil(month / 3)}`;
    if (windowType === "CALENDAR_YEAR") return String(year);
    return date.slice(0, 7);
  }

  function normalizedRule(rule = {}) {
    const consequenceType = upper(rule.consequence_type || "WARNING");
    const windowType = upper(rule.counting_period_type || rule.window_type || "CALENDAR_MONTH");
    const fallbackAction = upper(rule.insufficient_balance_action || "MANUAL_REVIEW");
    return {
      ...rule,
      rule_id: text(rule.rule_id),
      policy_id: text(rule.policy_id),
      rule_name: text(rule.rule_name),
      incident_code: incidentCode(rule.incident_code),
      occurrence_threshold: Math.max(1, Math.floor(number(rule.occurrence_threshold, 1))),
      counting_period_type: WINDOW_TYPES.has(windowType) ? windowType : "CALENDAR_MONTH",
      counting_period_value: Math.max(1, Math.floor(number(rule.counting_period_value, 30))),
      consequence_type: CONSEQUENCE_TYPES.has(consequenceType) ? consequenceType : "WARNING",
      leave_code: upper(rule.leave_code),
      consequence_units: roundUnits(rule.consequence_units || 1),
      insufficient_balance_action: FALLBACK_ACTIONS.has(fallbackAction) ? fallbackAction : "MANUAL_REVIEW",
      priority: Math.max(0, Math.floor(number(rule.priority, 100))),
      status: text(rule.status || "Active")
    };
  }

  function groupEvents(events = [], rule = {}) {
    const sorted = [...events].sort((left, right) => left.work_date.localeCompare(right.work_date) || left.attendance_id.localeCompare(right.attendance_id));
    if (rule.counting_period_type !== "ROLLING_DAYS") {
      const groups = new Map();
      sorted.forEach(event => {
        const key = calendarPeriodKey(event.work_date, rule.counting_period_type);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(event);
      });
      return groups;
    }
    const groups = new Map();
    for (let index = 0; index < sorted.length; index += 1) {
      const start = sorted[index].work_date;
      const endDate = new Date(`${start}T00:00:00Z`);
      endDate.setUTCDate(endDate.getUTCDate() + rule.counting_period_value - 1);
      const end = endDate.toISOString().slice(0, 10);
      const batch = sorted.slice(index).filter(event => event.work_date <= end);
      groups.set(`${start}..${end}`, batch);
    }
    return groups;
  }

  function transactionId(ruleId, employeeId, sourceIds = []) {
    return `attendance-penalty-${safe(ruleId)}-${safe(employeeId)}-${fnv1a(sourceIds.join("|"))}`;
  }

  function balanceMap(snapshot = {}) {
    const balances = new Map();
    array(snapshot.leave_ledger).forEach(entry => {
      if (!text(entry.ledger_id).startsWith("leave-ledger-balance-")) return;
      const key = `${text(entry.employee_id)}|${upper(entry.leave_code)}`;
      balances.set(key, number(entry.available_days));
    });
    return balances;
  }

  function incidentLabel(value = "") {
    return incidentCode(value)
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, character => character.toUpperCase());
  }

  function warningNotificationId(transactionIdValue = "") {
    return `in-app-notification-${safe(transactionIdValue)}`;
  }

  function warningNotificationRecord(transaction = {}, prior = {}, now = new Date().toISOString()) {
    const sourceDates = array(transaction.source_dates).map(normalizeDate).filter(Boolean);
    const incident = incidentLabel(transaction.incident_code) || "Attendance";
    const occurrenceThreshold = Math.max(1, Math.floor(number(transaction.occurrence_threshold, sourceDates.length || 1)));
    const employeeName = text(transaction.employee_name || transaction.employee_id || "Employee");
    const previousWasActive = upper(prior.status) === "ACTIVE";
    const payload = {
      rule_id: text(transaction.rule_id),
      policy_id: text(transaction.policy_id),
      source_attendance_ids: array(transaction.source_attendance_ids),
      source_dates: sourceDates,
      consequence_type: "WARNING"
    };
    const next = {
      tenant_id: text(prior.tenant_id || transaction.tenant_id),
      notification_id: text(prior.notification_id) || warningNotificationId(transaction.transaction_id),
      source_type: WARNING_NOTIFICATION_SOURCE,
      source_id: text(transaction.transaction_id),
      recipient_type: "HRMS_MANAGER",
      recipient_employee_id: text(transaction.employee_id),
      employee_name: employeeName,
      entity_id: text(transaction.entity_id),
      location_id: text(transaction.location_id),
      title: "Attendance warning",
      message: `${employeeName} reached ${occurrenceThreshold} ${incident} incident${occurrenceThreshold === 1 ? "" : "s"} in ${text(transaction.period_key) || "the configured period"}. No leave or pay deduction was applied.`,
      severity: "WARNING",
      status: "ACTIVE",
      read_status: previousWasActive && upper(prior.read_status) === "READ" ? "READ" : "UNREAD",
      action_page: "attendance-list",
      period_key: text(transaction.period_key),
      incident_code: incidentCode(transaction.incident_code),
      occurrence_threshold: occurrenceThreshold,
      source_dates: sourceDates,
      payload,
      created_at: text(prior.created_at || transaction.created_at) || now,
      updated_at: text(prior.updated_at || transaction.updated_at) || now,
      read_at: previousWasActive && upper(prior.read_status) === "READ" ? text(prior.read_at) : "",
      resolved_at: ""
    };
    const comparablePrior = { ...prior, updated_at: "" };
    const comparableNext = { ...next, updated_at: "" };
    if (!text(prior.notification_id) || JSON.stringify(comparablePrior) !== JSON.stringify(comparableNext)) next.updated_at = now;
    return next;
  }

  function reconcileWarningNotifications(existingNotifications = [], transactions = [], now = new Date().toISOString()) {
    const existing = array(existingNotifications).map(notification => ({ ...notification }));
    const warningRecordsBySource = new Map();
    existing.forEach(notification => {
      if (upper(notification.source_type) !== WARNING_NOTIFICATION_SOURCE || !text(notification.source_id)) return;
      if (!warningRecordsBySource.has(text(notification.source_id))) warningRecordsBySource.set(text(notification.source_id), notification);
    });
    const activeWarningTransactions = array(transactions)
      .filter(transaction => upper(transaction.consequence_type) === "WARNING" && upper(transaction.workflow_status) === "APPLIED")
      .sort((left, right) => text(left.created_at).localeCompare(text(right.created_at)) || text(left.transaction_id).localeCompare(text(right.transaction_id)));
    const activeSources = new Set(activeWarningTransactions.map(transaction => text(transaction.transaction_id)));
    const generated = activeWarningTransactions.map(transaction => warningNotificationRecord(
      transaction,
      warningRecordsBySource.get(text(transaction.transaction_id)) || {},
      now
    ));
    const preserved = existing.flatMap(notification => {
      if (upper(notification.source_type) !== WARNING_NOTIFICATION_SOURCE) return [{ ...notification }];
      const sourceId = text(notification.source_id);
      if (activeSources.has(sourceId) && warningRecordsBySource.get(sourceId) === notification) return [];
      if (upper(notification.status) === "RESOLVED") return [{ ...notification }];
      return [{
        ...notification,
        status: "RESOLVED",
        resolved_at: text(notification.resolved_at) || now,
        updated_at: now
      }];
    });
    return [...generated, ...preserved];
  }

  function reconcile(snapshot = {}, options = {}) {
    const now = text(options.now) || new Date().toISOString();
    const activeRules = array(snapshot.attendance_penalty_rules)
      .map(normalizedRule)
      .filter(rule => rule.rule_id && rule.policy_id && rule.incident_code && upper(rule.status) === "ACTIVE")
      .sort((left, right) => left.priority - right.priority || left.rule_id.localeCompare(right.rule_id));
    const eventList = attendanceEvents(snapshot);
    const validEventIds = new Set(eventList.map(event => `${event.attendance_id}|${event.policy_id}|${event.incident_code}`));
    const existingTransactions = array(snapshot.attendance_penalty_transactions).map(transaction => ({ ...transaction }));
    const nextTransactions = [];
    const nextAudits = array(snapshot.attendance_penalty_audit).map(audit => ({ ...audit }));
    const balances = balanceMap(snapshot);
    const activeRuleIds = new Set(activeRules.map(rule => rule.rule_id));

    existingTransactions.forEach(transaction => {
      const status = upper(transaction.workflow_status);
      const sourceIds = array(transaction.source_attendance_ids);
      const sourcesValid = sourceIds.every(id => validEventIds.has(`${id}|${text(transaction.policy_id)}|${incidentCode(transaction.incident_code)}`));
      if (status === "REVERSAL_PENDING") {
        nextTransactions.push(transaction);
        return;
      }
      if (ACTIVE_TRANSACTION_STATUSES.has(status) && (!activeRuleIds.has(text(transaction.rule_id)) || !sourcesValid)) {
        if (status === "PAYROLL_APPLIED") {
          nextTransactions.push({ ...transaction, workflow_status: "REVERSAL_PENDING", reversal_reason: "Source attendance or rule changed after payroll application", updated_at: now });
          nextAudits.push({
            audit_id: `attendance-penalty-audit-${fnv1a(`${transaction.transaction_id}|REVERSAL_PENDING|${now}`)}`,
            transaction_id: transaction.transaction_id,
            rule_id: transaction.rule_id,
            employee_id: transaction.employee_id,
            action: "REVERSAL_PENDING",
            detail: "Source attendance or rule changed after payroll application.",
            payload: {},
            created_at: now
          });
        } else {
          nextTransactions.push({ ...transaction, workflow_status: "REVERSED", reversed_at: now, reversal_reason: "Source attendance or rule is no longer eligible", updated_at: now });
          nextAudits.push({
            audit_id: `attendance-penalty-audit-${fnv1a(`${transaction.transaction_id}|REVERSED|${now}`)}`,
            transaction_id: transaction.transaction_id,
            rule_id: transaction.rule_id,
            employee_id: transaction.employee_id,
            action: "REVERSED",
            detail: "Source attendance or rule is no longer eligible.",
            payload: {},
            created_at: now
          });
        }
      } else {
        nextTransactions.push(transaction);
      }
    });

    const transactionById = new Map(nextTransactions
      .filter(transaction => upper(transaction.workflow_status) !== "REVERSED")
      .map(transaction => [text(transaction.transaction_id), transaction]));
    const transactionIndexById = new Map(nextTransactions
      .map((transaction, index) => [text(transaction.transaction_id), index])
      .filter(([transactionId]) => transactionId));
    const existingCounters = new Map(array(snapshot.attendance_incident_counters)
      .map(counter => [text(counter.counter_id), counter]));
    const counters = [];
    activeRules.forEach(rule => {
      const matching = eventList.filter(event => event.policy_id === rule.policy_id && event.incident_code === rule.incident_code);
      const employeeGroups = new Map();
      matching.forEach(event => {
        if (!employeeGroups.has(event.employee_id)) employeeGroups.set(event.employee_id, []);
        employeeGroups.get(event.employee_id).push(event);
      });
      employeeGroups.forEach((employeeEvents, employeeId) => {
        groupEvents(employeeEvents, rule).forEach((periodEvents, periodKey) => {
          const qualifyingIds = periodEvents.map(event => event.attendance_id);
          const consumedIds = new Set(nextTransactions
            .filter(transaction => transaction.rule_id === rule.rule_id && transaction.employee_id === employeeId && ACTIVE_TRANSACTION_STATUSES.has(upper(transaction.workflow_status)))
            .flatMap(transaction => array(transaction.source_attendance_ids)));
          const available = periodEvents.filter(event => !consumedIds.has(event.attendance_id));
          for (let offset = 0; offset + rule.occurrence_threshold <= available.length; offset += rule.occurrence_threshold) {
            const sources = available.slice(offset, offset + rule.occurrence_threshold);
            const sourceIds = sources.map(event => event.attendance_id);
            const id = transactionId(rule.rule_id, employeeId, sourceIds);
            if (transactionById.has(id)) continue;
            const priorTransactionIndex = transactionIndexById.get(id);
            const priorTransaction = Number.isInteger(priorTransactionIndex)
              ? nextTransactions[priorTransactionIndex]
              : null;
            const employee = sources[0];
            let consequenceType = rule.consequence_type;
            let workflowStatus = consequenceType === "MANUAL_REVIEW" ? "MANUAL_REVIEW" : "APPLIED";
            if (consequenceType === "LEAVE_DEDUCTION") {
              const balanceKey = `${employeeId}|${rule.leave_code}`;
              const availableBalance = balances.get(balanceKey) || 0;
              if (!rule.leave_code || availableBalance < rule.consequence_units) {
                consequenceType = rule.insufficient_balance_action;
                workflowStatus = consequenceType === "LOSS_OF_PAY" ? "APPLIED" : "MANUAL_REVIEW";
              } else {
                balances.set(balanceKey, availableBalance - rule.consequence_units);
              }
            }
            if (consequenceType === "SKIP") {
              workflowStatus = "SKIPPED";
            }
            const transaction = {
              ...(priorTransaction || {}),
              transaction_id: id,
              rule_id: rule.rule_id,
              policy_id: rule.policy_id,
              employee_id: employeeId,
              employee_name: employee.employee_name,
              entity_id: employee.entity_id,
              location_id: employee.location_id,
              period_key: periodKey,
              incident_code: rule.incident_code,
              occurrence_threshold: rule.occurrence_threshold,
              source_attendance_ids: sourceIds,
              source_dates: sources.map(event => event.work_date),
              consequence_type: consequenceType,
              leave_code: consequenceType === "LEAVE_DEDUCTION" ? rule.leave_code : "",
              units: rule.consequence_units,
              fallback_action: rule.insufficient_balance_action,
              workflow_status: workflowStatus,
              ledger_id: "",
              reversal_reason: "",
              reversed_at: "",
              created_at: text(priorTransaction?.created_at) || now,
              updated_at: now
            };
            if (Number.isInteger(priorTransactionIndex)) {
              nextTransactions[priorTransactionIndex] = transaction;
            } else {
              nextTransactions.push(transaction);
              transactionIndexById.set(id, nextTransactions.length - 1);
            }
            transactionById.set(id, transaction);
            sourceIds.forEach(sourceId => consumedIds.add(sourceId));
            nextAudits.push({
              audit_id: `attendance-penalty-audit-${fnv1a(`${id}|${priorTransaction ? "REACTIVATED" : "CREATED"}|${priorTransaction ? now : ""}`)}`,
              transaction_id: id,
              rule_id: rule.rule_id,
              employee_id: employeeId,
              action: priorTransaction ? "REACTIVATED" : "CREATED",
              detail: priorTransaction
                ? `${rule.occurrence_threshold} ${rule.incident_code} incident(s) became eligible again and the existing transaction was reactivated.`
                : `${rule.occurrence_threshold} ${rule.incident_code} incident(s) converted to ${consequenceType}.`,
              payload: { source_attendance_ids: sourceIds, period_key: periodKey, units: rule.consequence_units },
              created_at: now
            });
          }
          const counterId = `attendance-incident-counter-${safe(rule.rule_id)}-${safe(employeeId)}-${fnv1a(periodKey)}`;
          const priorCounter = existingCounters.get(counterId) || {};
          const counter = {
            ...priorCounter,
            counter_id: counterId,
            rule_id: rule.rule_id,
            policy_id: rule.policy_id,
            employee_id: employeeId,
            period_key: periodKey,
            incident_code: rule.incident_code,
            occurrence_count: periodEvents.length,
            consumed_count: [...consumedIds].filter(id => qualifyingIds.includes(id)).length,
            qualifying_attendance_ids: qualifyingIds,
            status: "Active",
            last_incident_date: periodEvents.at(-1)?.work_date || "",
            created_at: text(priorCounter.created_at) || now,
            updated_at: text(priorCounter.updated_at) || now
          };
          const comparablePrior = { ...priorCounter, updated_at: counter.updated_at };
          const comparableNext = { ...counter, updated_at: counter.updated_at };
          if (JSON.stringify(comparablePrior) !== JSON.stringify(comparableNext)) counter.updated_at = now;
          counters.push(counter);
        });
      });
    });
    const nextNotifications = reconcileWarningNotifications(snapshot.in_app_notifications, nextTransactions, now);
    const result = {
      ...snapshot,
      attendance_incident_counters: counters,
      attendance_penalty_transactions: nextTransactions,
      attendance_penalty_audit: nextAudits,
      in_app_notifications: nextNotifications
    };
    return { snapshot: result, changed: ["attendance_incident_counters", "attendance_penalty_transactions", "attendance_penalty_audit", "in_app_notifications"].some(table => JSON.stringify(array(snapshot[table])) !== JSON.stringify(array(result[table]))) };
  }

  function leaveDeductionUnits(transactions = [], employeeId = "", leaveCode = "") {
    return array(transactions).reduce((total, transaction) => {
      if (text(transaction.employee_id) !== text(employeeId)
        || upper(transaction.leave_code) !== upper(leaveCode)
        || upper(transaction.consequence_type) !== "LEAVE_DEDUCTION"
        || !["APPLIED", "PAYROLL_APPLIED"].includes(upper(transaction.workflow_status))) return total;
      return total + roundUnits(transaction.units);
    }, 0);
  }

  function lossOfPayCandidates(transactions = []) {
    return array(transactions).filter(transaction =>
      upper(transaction.consequence_type) === "LOSS_OF_PAY"
      && ["APPLIED", "PAYROLL_APPLIED"].includes(upper(transaction.workflow_status))
    ).map(transaction => ({
      employee_id: text(transaction.employee_id),
      employee_name: text(transaction.employee_name || transaction.employee_id),
      organization_id: text(transaction.entity_id),
      location_id: text(transaction.location_id),
      location: text(transaction.location),
      work_date: normalizeDate(array(transaction.source_dates).at(-1)),
      units: roundUnits(transaction.units),
      workflow_status: upper(transaction.workflow_status) === "PAYROLL_APPLIED" ? "PAYROLL_APPLIED" : "APPROVED",
      source_type: "ATTENDANCE_PENALTY",
      source_id: text(transaction.transaction_id),
      source_priority: 45
    })).filter(candidate => candidate.employee_id && candidate.work_date && candidate.source_id);
  }

  function validateSnapshot(snapshot = {}) {
    const policyIds = new Set(array(snapshot.attendance_policies).map(policy => text(policy.policy_id)).filter(Boolean));
    const employeeIds = new Set(array(snapshot.employees).map(employee => text(employee.employee_id)).filter(Boolean));
    const ruleIds = new Set();
    const blockers = [];
    array(snapshot.attendance_penalty_rules).map(normalizedRule).forEach(rule => {
      if (!rule.rule_id) blockers.push({ record_id: "(blank)", detail: "Penalty rule ID is required." });
      if (ruleIds.has(rule.rule_id)) blockers.push({ record_id: rule.rule_id, detail: "Duplicate penalty rule ID." });
      ruleIds.add(rule.rule_id);
      if (!policyIds.has(rule.policy_id)) blockers.push({ record_id: rule.rule_id, detail: `Attendance policy ${rule.policy_id || "(blank)"} does not exist.` });
      if (!rule.incident_code) blockers.push({ record_id: rule.rule_id, detail: "Incident type is required." });
      if (rule.consequence_type === "LEAVE_DEDUCTION" && !rule.leave_code) blockers.push({ record_id: rule.rule_id, detail: "Leave deduction requires a leave type." });
      if (rule.consequence_units <= 0) blockers.push({ record_id: rule.rule_id, detail: "Consequence quantity must be greater than zero." });
      if (["LEAVE_DEDUCTION", "LOSS_OF_PAY"].includes(rule.consequence_type) && ![0.5, 1].includes(rule.consequence_units)) {
        blockers.push({ record_id: rule.rule_id, detail: "Leave and Loss of Pay consequences must be 0.5 or 1 day." });
      }
    });
    const transactionIds = new Set();
    const transactionsById = new Map();
    array(snapshot.attendance_penalty_transactions).forEach(transaction => {
      const id = text(transaction.transaction_id);
      if (!id) blockers.push({ record_id: "(blank)", detail: "Penalty transaction ID is missing." });
      else if (transactionIds.has(id)) blockers.push({ record_id: id, detail: `Penalty transaction ${id} is duplicated.` });
      transactionIds.add(id);
      transactionsById.set(id, transaction);
      if (!ruleIds.has(text(transaction.rule_id))) blockers.push({ record_id: id, detail: `Penalty rule ${text(transaction.rule_id) || "(blank)"} does not exist.` });
      if (employeeIds.size && !employeeIds.has(text(transaction.employee_id))) blockers.push({ record_id: id, detail: `Employee ${text(transaction.employee_id) || "(blank)"} does not exist.` });
    });
    const notificationIds = new Set();
    const warningSourceIds = new Set();
    array(snapshot.in_app_notifications).forEach(notification => {
      const id = text(notification.notification_id);
      if (!id || notificationIds.has(id)) blockers.push({ record_id: id || "(blank)", detail: "In-app notification ID must be present and unique." });
      notificationIds.add(id);
      if (upper(notification.source_type) !== WARNING_NOTIFICATION_SOURCE) return;
      const sourceId = text(notification.source_id);
      if (!sourceId || warningSourceIds.has(sourceId)) blockers.push({ record_id: id || "(blank)", detail: "An attendance warning transaction may have only one in-app notification." });
      warningSourceIds.add(sourceId);
      const source = transactionsById.get(sourceId);
      if (!source || upper(source.consequence_type) !== "WARNING") {
        blockers.push({ record_id: id || "(blank)", detail: `Warning source transaction ${sourceId || "(blank)"} does not exist.` });
      }
      if (employeeIds.size && !employeeIds.has(text(notification.recipient_employee_id))) {
        blockers.push({ record_id: id || "(blank)", detail: `Notification employee ${text(notification.recipient_employee_id) || "(blank)"} does not exist.` });
      }
      if (upper(notification.status) === "ACTIVE" && (!text(notification.entity_id) || !text(notification.location_id))) {
        blockers.push({ record_id: id || "(blank)", detail: "Active attendance warning notifications require Entity and Location ownership." });
      }
    });
    return blockers.length ? { ok: false, error: "Attendance penalty integrity validation failed.", blockers, table: blockers.some(item => /notification/i.test(item.detail)) ? "in_app_notifications" : "attendance_penalty_rules" } : { ok: true, blockers: [] };
  }

  return Object.freeze({
    attendanceEvents,
    calendarPeriodKey,
    incidentCode,
    leaveDeductionUnits,
    lossOfPayCandidates,
    normalizedRule,
    reconcile,
    reconcileWarningNotifications,
    validateSnapshot
  });
});
