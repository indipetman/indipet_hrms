(function attachRosterOptimizer(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HrmsRosterOptimizer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createRosterOptimizer() {
  const BLOCKED_COST = 5000000;
  const OPEN_SLOT_COST = 1000000;
  const KEYHOLDER_HIERARCHY_COST = 100000;

  const stableHash = value => {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  };

  const parseClockMinutes = value => {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;
    const meridiem = String(match[3] || "").toUpperCase();
    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      if (hour === 12) hour = 0;
      if (meridiem === "PM") hour += 12;
    } else if (hour > 23) {
      return null;
    }
    return hour * 60 + minute;
  };

  const parseShiftTiming = value => {
    const parts = String(value || "").split(/\s+-\s+/).map(item => item.trim()).filter(Boolean);
    if (parts.length !== 2) return null;
    const start = parseClockMinutes(parts[0]);
    const end = parseClockMinutes(parts[1]);
    if (start === null || end === null) return null;
    return { start, end, endAbsolute: end <= start ? end + 1440 : end };
  };

  const restMinutesBetweenTimings = (previousTiming, nextTiming, dayGap = 1) => {
    if (Number(dayGap) > 1) return Number.POSITIVE_INFINITY;
    if (Number(dayGap) < 1) return 0;
    const previous = parseShiftTiming(previousTiming);
    const next = parseShiftTiming(nextTiming);
    if (!previous || !next) return Number.POSITIVE_INFINITY;
    return Math.max(0, next.start + 1440 - previous.endAbsolute);
  };

  // Minimum-cost square assignment. Rows are employees (plus recovery dummies),
  // columns are required/extra shift positions.
  const hungarian = matrix => {
    const size = matrix.length;
    if (!size) return [];
    const u = Array(size + 1).fill(0);
    const v = Array(size + 1).fill(0);
    const p = Array(size + 1).fill(0);
    const way = Array(size + 1).fill(0);
    for (let row = 1; row <= size; row += 1) {
      p[0] = row;
      let column0 = 0;
      const minValue = Array(size + 1).fill(Number.POSITIVE_INFINITY);
      const used = Array(size + 1).fill(false);
      do {
        used[column0] = true;
        const row0 = p[column0];
        let delta = Number.POSITIVE_INFINITY;
        let column1 = 0;
        for (let column = 1; column <= size; column += 1) {
          if (used[column]) continue;
          const current = matrix[row0 - 1][column - 1] - u[row0] - v[column];
          if (current < minValue[column]) {
            minValue[column] = current;
            way[column] = column0;
          }
          if (minValue[column] < delta) {
            delta = minValue[column];
            column1 = column;
          }
        }
        for (let column = 0; column <= size; column += 1) {
          if (used[column]) {
            u[p[column]] += delta;
            v[column] -= delta;
          } else {
            minValue[column] -= delta;
          }
        }
        column0 = column1;
      } while (p[column0] !== 0);
      do {
        const column1 = way[column0];
        p[column0] = p[column1];
        column0 = column1;
      } while (column0 !== 0);
    }
    const assignment = Array(size).fill(-1);
    for (let column = 1; column <= size; column += 1) {
      if (p[column]) assignment[p[column] - 1] = column - 1;
    }
    return assignment;
  };

  const normalizedShift = (shift, index) => {
    const preferredKeyholderIds = Array.isArray(shift?.preferredKeyholderIds)
      ? shift.preferredKeyholderIds.filter(Boolean).map(String)
      : [];
    const primaryKeyholderId = String(shift?.primaryKeyholderId || preferredKeyholderIds[0] || "");
    const backupKeyholderId = String(shift?.backupKeyholderId || preferredKeyholderIds[1] || "");
    return {
      id: String(shift?.id || ""),
      name: String(shift?.name || shift?.id || "Shift"),
      timing: String(shift?.timing || ""),
      requiredStaff: Math.max(0, Number(shift?.requiredStaff || 0)),
      keyholderRequired: shift?.keyholderRequired === true,
      primaryKeyholderId,
      backupKeyholderId: backupKeyholderId === primaryKeyholderId ? "" : backupKeyholderId,
      index
    };
  };

  const extraDistributions = (shifts, employeeCount) => {
    const required = shifts.reduce((total, shift) => total + shift.requiredStaff, 0);
    const extra = Math.max(0, employeeCount - required);
    if (!extra) return [shifts.map(shift => shift.requiredStaff)];
    const variants = [];
    const offsets = Math.min(Math.max(1, shifts.length), 6);
    for (let offset = 0; offset < offsets; offset += 1) {
      const counts = shifts.map(shift => shift.requiredStaff);
      for (let step = 0; step < extra; step += 1) {
        const ranked = shifts.map((shift, index) => ({
          index,
          load: counts[index] / Math.max(1, shift.requiredStaff),
          tie: (index - offset + shifts.length) % shifts.length
        })).sort((a, b) => a.load - b.load || a.tie - b.tie);
        counts[ranked[0].index] += 1;
      }
      const signature = counts.join("|");
      if (!variants.some(item => item.signature === signature)) variants.push({ signature, counts });
    }
    return variants.map(item => item.counts);
  };

  const buildSlots = (shifts, distribution) => shifts.flatMap((shift, shiftIndex) =>
    Array.from({ length: distribution[shiftIndex] || 0 }, (_, position) => ({
      shift,
      position,
      required: position < shift.requiredStaff,
      requiresKeyholder: shift.keyholderRequired && position === 0
    }))
  );

  const shiftCost = (employee, slot, context) => {
    const shift = slot.shift;
    let cost = 100;
    if (slot.requiresKeyholder && !employee.keyholderEligible) cost += BLOCKED_COST;
    if (slot.requiresKeyholder && employee.keyholderEligible) {
      const hierarchy = [shift.primaryKeyholderId, shift.backupKeyholderId].filter(Boolean);
      const hierarchyIndex = hierarchy.indexOf(String(employee.id));
      const hierarchyRank = hierarchyIndex >= 0
        ? hierarchyIndex
        : hierarchy.length
          ? hierarchy.length + 1
          : 0;
      cost += hierarchyRank * KEYHOLDER_HIERARCHY_COST;
      cost += Number(employee.keyholderDutyCount || 0) * 12;
    }

    const fixedPreference = context.respectPreferences
      && String(employee.shiftPreferenceMode || "").toLowerCase() === "fixed"
      && employee.defaultShiftId;
    if (fixedPreference && String(employee.defaultShiftId) !== shift.id) cost += 20000;

    const previous = employee.previousAssignment;
    if (previous) {
      const rest = restMinutesBetweenTimings(previous.timing, shift.timing, previous.dayGap ?? 1);
      if (rest < context.minimumRestMinutes) cost += 10000 + (context.minimumRestMinutes - rest) * 10;
      if (String(previous.shiftId || "") === shift.id) {
        cost -= 18;
      } else {
        const previousIndex = context.shiftIndexById.get(String(previous.shiftId || ""));
        cost += previousIndex > shift.index ? 90 : 24;
      }
    }

    if (employee.currentWeekShiftId && String(employee.currentWeekShiftId) !== shift.id) cost += 170;
    if (employee.previousWeekShiftId && String(employee.previousWeekShiftId) === shift.id) cost += 35;
    cost += Number(employee.shiftCounts?.[shift.id] || 0) * 5;
    cost += stableHash(`${context.seed}|${employee.id}|${shift.id}|${slot.position}`) % 7;
    return cost;
  };

  const solveDay = ({
    employees = [],
    shifts = [],
    respectPreferences = true,
    minimumRestMinutes = 480,
    seed = ""
  } = {}) => {
    const normalizedShifts = shifts.map(normalizedShift).filter(shift => shift.id);
    const normalizedEmployees = employees.map(employee => ({ ...employee, id: String(employee?.id || "") })).filter(employee => employee.id);
    const requiredTotal = normalizedShifts.reduce((total, shift) => total + shift.requiredStaff, 0);
    if (!normalizedShifts.length) {
      return { allocations: [], openSlots: [], warnings: [], score: 0 };
    }
    const context = {
      respectPreferences: respectPreferences === true,
      minimumRestMinutes: Math.max(0, Number(minimumRestMinutes || 0)),
      seed,
      shiftIndexById: new Map(normalizedShifts.map(shift => [shift.id, shift.index]))
    };
    let best = null;

    for (const distribution of extraDistributions(normalizedShifts, normalizedEmployees.length)) {
      const slots = buildSlots(normalizedShifts, distribution);
      const size = Math.max(normalizedEmployees.length, slots.length);
      const rows = [
        ...normalizedEmployees.map(employee => ({ type: "employee", employee })),
        ...Array.from({ length: size - normalizedEmployees.length }, (_, index) => ({ type: "dummy", id: `open-${index}` }))
      ];
      const paddedSlots = [
        ...slots,
        ...Array.from({ length: size - slots.length }, (_, index) => ({ type: "unused", id: `unused-${index}` }))
      ];
      const matrix = rows.map(row => paddedSlots.map(slot => {
        if (slot.type === "unused") return row.type === "dummy" ? 0 : OPEN_SLOT_COST;
        if (row.type === "dummy") {
          return slot.required
            ? OPEN_SLOT_COST + (slot.requiresKeyholder ? 25000 : 0)
            : 10;
        }
        return shiftCost(row.employee, slot, context);
      }));
      const assignment = hungarian(matrix);
      const score = assignment.reduce((total, column, row) => total + matrix[row][column], 0);
      if (!best || score < best.score) best = { rows, slots: paddedSlots, assignment, score };
    }

    const allocations = [];
    const openSlots = [];
    const warnings = [];
    best.assignment.forEach((column, rowIndex) => {
      const row = best.rows[rowIndex];
      const slot = best.slots[column];
      if (!slot || slot.type === "unused") return;
      if (row.type === "dummy") {
        if (slot.required) {
          openSlots.push({
            shiftId: slot.shift.id,
            shiftName: slot.shift.name,
            requiresKeyholder: slot.requiresKeyholder,
            reason: slot.requiresKeyholder
              ? "No available keyholder can cover this required position."
              : "No available employee can cover this required position."
          });
        }
        return;
      }
      const employee = row.employee;
      const previous = employee.previousAssignment;
      const restMinutes = previous
        ? restMinutesBetweenTimings(previous.timing, slot.shift.timing, previous.dayGap ?? 1)
        : Number.POSITIVE_INFINITY;
      const preferenceOverride = Boolean(
        context.respectPreferences
        && String(employee.shiftPreferenceMode || "").toLowerCase() === "fixed"
        && employee.defaultShiftId
        && String(employee.defaultShiftId) !== slot.shift.id
      );
      const restViolation = restMinutes < context.minimumRestMinutes;
      allocations.push({
        employee,
        shift: slot.shift,
        extra: !slot.required,
        requiresKeyholder: slot.requiresKeyholder,
        preferenceOverride,
        restViolation,
        restMinutes
      });
      if (restViolation) {
        warnings.push({
          employeeId: employee.id,
          shiftId: slot.shift.id,
          type: "Minimum Rest",
          detail: `${employee.name || employee.id} receives ${Math.floor(restMinutes / 60)}h ${restMinutes % 60}m rest before ${slot.shift.name}; minimum is ${Math.floor(context.minimumRestMinutes / 60)}h ${context.minimumRestMinutes % 60}m.`
        });
      }
      if (preferenceOverride) {
        warnings.push({
          employeeId: employee.id,
          shiftId: slot.shift.id,
          type: "Shift Preference Override",
          detail: `${employee.name || employee.id}'s fixed shift preference was overridden to satisfy coverage.`
        });
      }
    });

    return {
      allocations,
      openSlots,
      warnings,
      score: best?.score || 0,
      requiredTotal,
      assignedTotal: allocations.length
    };
  };

  return {
    parseClockMinutes,
    parseShiftTiming,
    restMinutesBetweenTimings,
    solveDay
  };
});
