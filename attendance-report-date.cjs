(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AttendanceReportDate = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function isValidDateParts(year, month, day) {
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  }

  function fromParts(yearText, monthText, dayText) {
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    if (!isValidDateParts(year, month, day)) return "";
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function normalize(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return fromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }
    const text = String(value || "").trim();
    if (!text) return "";

    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
    if (isoMatch) return fromParts(isoMatch[1], isoMatch[2], isoMatch[3]);

    const displayMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayMatch) return fromParts(displayMatch[3], displayMatch[2], displayMatch[1]);

    return "";
  }

  function normalizeRange(startValue, endValue, changedBoundary = "") {
    let start = normalize(startValue);
    let end = normalize(endValue);
    if (start && end && start > end) {
      if (changedBoundary === "end") start = end;
      else end = start;
    }
    return { start, end };
  }

  function isWithinRange(value, startValue, endValue) {
    const valueDate = normalize(value);
    const { start, end } = normalizeRange(startValue, endValue);
    if (!start && !end) return true;
    if (!valueDate) return false;
    return (!start || valueDate >= start) && (!end || valueDate <= end);
  }

  function monthRange(referenceDate = new Date()) {
    if (!(referenceDate instanceof Date) || Number.isNaN(referenceDate.getTime())) {
      return { start: "", end: "" };
    }
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    return {
      start: fromParts(year, month + 1, 1),
      end: fromParts(year, month + 1, new Date(year, month + 1, 0).getDate())
    };
  }

  return { normalize, normalizeRange, isWithinRange, monthRange };
});
