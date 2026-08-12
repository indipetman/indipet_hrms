const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "hrms_dashboard_nav_visual.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.mjs"), "utf8");
const modalSource = html.slice(
  html.indexOf("function attendanceEmployeeOptions"),
  html.indexOf("function openModal")
);
const submitSource = html.slice(
  html.indexOf('$("#recordForm").addEventListener'),
  html.indexOf('if (submissionPage === "department-master")', html.indexOf('$("#recordForm").addEventListener'))
);

test("manual attendance captures evidence and calculates context instead of using generic record fields", () => {
  assert.match(modalSource, /recordAttendanceEmployee/);
  assert.match(modalSource, /role="combobox"/);
  assert.match(modalSource, /role="listbox"/);
  assert.match(modalSource, /Search employee name or ID/);
  assert.match(modalSource, /function renderAttendanceEmployeeResults/);
  assert.match(modalSource, /data-attendance-employee-id/);
  assert.match(modalSource, /ArrowDown/);
  assert.match(modalSource, /ArrowUp/);
  assert.match(modalSource, /recordAttendanceDate/);
  assert.match(modalSource, /class="attendance-record-top-row"[\s\S]*recordAttendanceEmployeeSearch[\s\S]*recordAttendanceDate[\s\S]*recordAttendanceAction/);
  assert.match(html, /\.attendance-record-top-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(260px, 2fr\) minmax\(145px, 0\.8fr\) minmax\(155px, 0\.9fr\)/);
  assert.match(modalSource, /Published Roster Shift/);
  assert.match(modalSource, /recordAttendanceCheckIn/);
  assert.match(modalSource, /recordAttendanceCheckOut/);
  assert.match(modalSource, /renderAttendanceTimeControl/);
  assert.match(modalSource, /data-attendance-time-part="hour"/);
  assert.match(modalSource, /data-attendance-time-part="minute"/);
  assert.match(modalSource, /<option value="" \$\{hasValue \? "" : "selected"\}>MM<\/option>/);
  assert.match(modalSource, /if \(hour && minuteControl && !minuteControl\.value\) minuteControl\.value = "00"/);
  assert.match(modalSource, /data-attendance-time-part="period"/);
  assert.match(modalSource, />AM<\/option>/);
  assert.match(modalSource, />PM<\/option>/);
  assert.doesNotMatch(modalSource, /recordAttendanceCheck(?:In|Out)"[^>]*type="time"/);
  assert.match(modalSource, /Worked Hours/);
  assert.doesNotMatch(modalSource, /<label[^>]*>Proposed Status/);
  assert.match(modalSource, /recordAttendanceStatus"[^>]*type="hidden"/);
  assert.match(modalSource, /Detected Issue/);
  assert.match(modalSource, /Manual Entry Reason/);
  assert.match(modalSource, /Action defaults to Approve/);
  assert.match(modalSource, /id="recordAttendanceAction"[^>]*data-record-field="creation_action"[^>]*required/);
  assert.doesNotMatch(modalSource, /<option value="ACTIVE"[^>]*>Active<\/option>/);
  assert.match(modalSource, /<option value="APPROVE" selected>Approve<\/option>/);
  assert.match(modalSource, /<option value="NOT_APPROVE">Not Approve<\/option>/);
  assert.match(modalSource, /function setAttendanceTimeControl/);
  assert.doesNotMatch(modalSource, /<select id="recordAttendanceStatus"/);
  assert.doesNotMatch(modalSource, /<select id="recordAttendanceIssue"/);
});

test("manual attendance validates, audits, persists and prevents silent replacement", () => {
  assert.match(submitSource, /Attendance already exists[\s\S]*existing row's Edit action/);
  assert.match(submitSource, /Enter at least one punch/);
  assert.match(submitSource, /capture_method: "MANUAL"/);
  assert.match(submitSource, /creationAction = String\(\$\("#recordAttendanceAction"\)\.value \|\| "APPROVE"\)/);
  assert.match(submitSource, /lifecycle_status: approvedOnSubmit \? "APPROVED" : rejectedOnSubmit \? "COMPUTED" : "PENDING_REVIEW"/);
  assert.match(submitSource, /review_status: approvedOnSubmit \? "APPROVED" : rejectedOnSubmit \? "REJECTED" : "PENDING"/);
  assert.match(submitSource, /final_status: approvedOnSubmit \? status : ""/);
  assert.match(submitSource, /APPROVED_ON_SUBMISSION/);
  assert.match(submitSource, /NOT_APPROVED_ON_SUBMISSION/);
  assert.match(submitSource, /await persistHrmsReserve\(\)/);
  assert.match(submitSource, /const isAttendanceEdit/);
  assert.match(submitSource, /rowIndex !== attendanceTargetIndex/);
  assert.match(submitSource, /EDITED_PENDING_REVIEW/);
  assert.match(submitSource, /const matchingProjectionIndex/);
  assert.match(submitSource, /const attendanceTargetIndex/);
  assert.match(submitSource, /rows\[attendanceTargetIndex\] = row/);
  assert.match(submitSource, /attendanceSources\[attendanceTargetIndex\] = sourceRecord/);
  assert.match(submitSource, /projection_only: false/);
  assert.match(submitSource, /event_type: "MANUAL_IN"/);
  assert.match(submitSource, /event_type: "MANUAL_OUT"/);
  assert.match(submitSource, /pageConfig\["attendance-list"\]\.rows\.push\(row\)/);
  assert.match(submitSource, /attendanceRecords\.push\(/);
  assert.match(submitSource, /worked_hours: workedHours/);
  assert.match(submitSource, /await persistHrmsReserve\(\)/);
});

test("manual attendance modal is not dismissed by an accidental backdrop click", () => {
  const backdropHandler = html.slice(
    html.indexOf('$("#recordModal").addEventListener("click"'),
    html.indexOf("$$('[data-attendance-override-close]')")
  );
  assert.match(backdropHandler, /event\.target !== \$\("#recordModal"\)/);
  assert.match(backdropHandler, /event\.stopPropagation\(\)/);
  assert.doesNotMatch(backdropHandler, /closeModal\(\)/);
});

test("worked hours are recalculated from the latest punch values", () => {
  assert.match(html, /const workedMinutes = attendanceWorkedMinutes\(checkIn, checkOut\);/);
  assert.match(html, /const workedHours = attendanceWorkedHoursLabel\(workedMinutes\);/);
  assert.match(html, /worked_minutes: workedMinutes,\s*worked_hours: workedHours/);
  assert.match(html, /row\[7\] = workedHours/);
  assert.match(html, /dashboardRecord\.worked_minutes = workedMinutes/);
});

test("attendance record actions support approval, absent, override, rejection, editing and deletion", () => {
  assert.match(html, /data-module-floating-action="approve"[^>]*>[\s\S]*?Approve<\/button>/);
  assert.match(html, /data-module-floating-action="reject"[^>]*>[\s\S]*?Not Approve<\/button>/);
  assert.match(html, /data-module-floating-action="absent"[^>]*>[\s\S]*?Mark Absent<\/button>/);
  assert.match(html, /data-module-floating-action="override"[^>]*>[\s\S]*?Override Status<\/button>/);
  assert.match(html, /data-module-floating-action="edit"[^>]*>[\s\S]*?Edit<\/button>/);
  assert.match(html, /data-module-floating-action="delete"[^>]*>[\s\S]*?Delete<\/button>/);
  assert.match(html, /editAction\.hidden = !canEdit/);
  assert.match(html, /openModal\(\{ mode: "edit", rowIndex \}\)/);
  assert.match(html, /"Edit Manual Attendance"/);
  assert.match(html, /async function reviewAttendanceRecord/);
  assert.match(html, /review_status = approved \? "APPROVED" : "REJECTED"/);
  assert.match(html, /final_status = approved \? proposedStatus : ""/);
  assert.match(html, /"Day Status", "Pay Treatment", "Review Status"/);
  assert.match(html, /function attendanceReviewStatus/);
  assert.match(html, /return "Pending Review"/);
  assert.match(html, /return "Approved"/);
  assert.match(html, /return "Not Approved"/);
  assert.match(html, /attendanceReviewStatus\(row\)/);
  assert.match(html, /source\.details\.calculated_day_status/);
  assert.match(html, /identity\.row\[9\] = proposedStatus/);
  assert.match(html, /async function deleteAttendanceRecord/);
  assert.match(html, /await deleteAttendanceRecord\(rowIndex\)/);
  assert.match(html, /const canMarkProjectedAbsent = isDailyProjection && finalDayStatus === "pending attendance"/);
  assert.match(html, /\(isDailyProjection && !canMarkProjectedAbsent\)/);
  assert.match(html, /if \(actionName === "absent"\)[\s\S]*openAttendanceOverrideModal\(rowIndex, "Absent"\)/);
});

test("absent and pending attendance can be replaced by an approved, balance-backed leave assignment", () => {
  assert.match(html, /data-module-floating-action="assign-leave"[^>]*>[\s\S]*?Assign Leave<\/button>/);
  assert.match(html, /leaveAssignableStatuses = \["absent", "pending attendance", "missing punch", "no show", "rejected"\]/);
  assert.match(html, /if \(actionName === "assign-leave"\)[\s\S]*openAttendanceLeaveAssignmentModal\(rowIndex\)/);
  assert.match(html, /id="attendanceLeaveAssignmentModal"/);
  assert.match(html, /Assign Leave to Attendance/);
  assert.match(html, /id="attendanceLeaveAssignmentType"/);
  assert.match(html, /id="attendanceLeaveAssignmentPortion"/);
  assert.doesNotMatch(html, /id="attendanceLeaveAssignmentBalanceList"/);
  assert.match(html, /Assign &amp; Approve Leave/);
  assert.match(html, /function renderAttendanceLeaveAssignmentBalances/);
  assert.match(html, /updateLeaveTypeBalanceOptions\("#attendanceLeaveAssignmentType", employeeId\)/);
  assert.match(html, /leaveTypeBalanceOptionLabel\(type, Boolean\(normalizedEmployeeId\)\)/);
  assert.match(html, /function assignLeaveToAttendance/);
  assert.match(html, /requestedDays = leavePortion === "FULL_DAY" \? 1 : 0\.5/);
  assert.match(html, /requestedDays > availableDays/);
  assert.match(html, /HrmsLeaveCapResolver\.evaluateApproval\(hrmsLeaveCapSnapshot\(\), leaveSource\)/);
  assert.match(html, /source_type: "ATTENDANCE_LEAVE_ASSIGNMENT"/);
  assert.match(html, /decision_status: "Approved"/);
  assert.match(html, /attendance_id: persistedAttendanceId/);
  assert.match(html, /leave_request_id: requestId/);
  assert.match(html, /action: "LEAVE_ASSIGNED"/);
  assert.match(html, /finalStatus = isLossOfPay[\s\S]*?leavePortion === "FULL_DAY" \? "On Leave" : "Half Day"/);
  assert.match(html, /capture_method: materializingProjection \? "LEAVE_ASSIGNMENT"/);
  assert.match(html, /const persistenceTarget = await persistHrmsReserve\(\);[\s\S]*linked leave and attendance records, so both were restored/);
});

test("Not Approve automatically rejects and detaches an attendance-origin leave", () => {
  assert.doesNotMatch(html, /data-module-floating-action="remove-assigned-leave"/);
  assert.doesNotMatch(html, /Remove Assigned Leave/);
  assert.match(html, /function detachAttendanceAssignedLeaveAfterRejection/);
  assert.match(html, /detachAttendanceAssignedLeaveAfterRejection\(identity, \{ actionAt: decisionAt, actionBy \}\)/);
  assert.match(html, /source_type \|\| ""\)\.toUpperCase\(\) !== "ATTENDANCE_LEAVE_ASSIGNMENT"/);
  assert.match(html, /leaveSource\.attendance_id = ""/);
  assert.match(html, /leaveSource\.attendance_record_id = ""/);
  assert.match(html, /attendance_record_id: ""/);
  assert.match(html, /review_status: "REJECTED"/);
  assert.match(html, /approved_days: 0/);
  assert.match(html, /identity\.source\.leave_request_id = ""/);
  assert.match(html, /leave_assignment_active: false/);
  assert.match(html, /action: "ASSIGNED_LEAVE_AUTO_DETACHED"/);
  assert.match(html, /record\.leave_days = \(record\.leave_days \|\| \[\]\)\.filter/);
  assert.match(html, /reconcileLeaveLedgerEntries\(\);[\s\S]*syncLeaveLedgerPage\(\);[\s\S]*await persistHrmsReserve\(\)/);
  assert.match(html, /persistenceTarget !== "excel"[\s\S]*applyHrmsReserve\(beforeSnapshot\)/);
  assert.match(html, /was automatically rejected and unlinked; its ledger effect was reversed/);
});

test("attendance leave assignment modal is not dismissed by clicking its backdrop", () => {
  assert.doesNotMatch(html, /\$\("#attendanceLeaveAssignmentModal"\)\.addEventListener\("click"/);
  assert.match(html, /data-attendance-leave-close/);
  assert.match(html, /closeAttendanceLeaveAssignmentModal/);
});

test("attendance exceptions are resolved inside Attendance Register without rewriting the published roster", () => {
  assert.match(html, /attendance-exception-resolver\.cjs/);
  assert.match(server, /url\.pathname === "\/attendance-exception-resolver\.cjs"/);
  assert.match(html, /id="attendanceExceptionModal"/);
  assert.match(html, /Resolve Attendance Exception/);
  assert.match(html, /id="attendanceExceptionShift"/);
  assert.match(html, /the roster stays unchanged/i);
  assert.match(html, /function attendanceExceptionForContext/);
  assert.match(html, /exception_type: assessment\.exceptionType/);
  assert.match(html, /original_roster_shift:/);
  assert.match(html, /suggested_shift_id:/);
  assert.match(html, /resolved_shift_id:/);
  assert.match(html, /function openAttendanceExceptionModal/);
  assert.match(html, /async function resolveAttendanceException/);
  assert.match(html, /ATTENDANCE_EXCEPTION_APPROVED/);
  assert.match(html, /AttendanceExceptionResolver\.isProperCompOffAttendance/);
  assert.match(html, /function approvedWeeklyOffWorkCompOffCandidates/);
  assert.doesNotMatch(html, /data-page="attendance-exceptions"/);
});

test("attendance status override is explicit, audited and protected from policy recalculation", () => {
  assert.match(html, /id="attendanceOverrideModal"/);
  assert.match(html, /id="attendanceOverrideStatus"/);
  assert.match(html, /<option value="Half Day">Half Day<\/option>/);
  assert.match(html, /Use Calculated Status \(remove override\)/);
  assert.match(html, /id="attendanceOverrideReason" minlength="5"/);
  assert.match(html, /function openAttendanceOverrideModal/);
  assert.match(html, /async function applyAttendanceOverride/);
  assert.match(html, /override_active: !removeOverride/);
  assert.match(html, /override_status: removeOverride \? "" : finalStatus/);
  assert.match(html, /override_reason: removeOverride \? "" : reason/);
  assert.match(html, /overridden_at: removeOverride \? "" : actionAt/);
  assert.match(html, /overridden_by: removeOverride \? "" : actionBy/);
  assert.match(html, /override_history:/);
  assert.match(html, /action: removeOverride \? "OVERRIDE_REMOVED" : directAbsentAction \? "MARKED_ABSENT" : "STATUS_OVERRIDDEN"/);
  assert.match(html, /const persistenceTarget = await persistHrmsReserve\(\);[\s\S]*persistenceTarget !== "excel"[\s\S]*applyHrmsReserve\(beforeSnapshot\)/);
  assert.match(html, /source\.details\?\.override_active[\s\S]*return "Overridden"/);
  assert.match(html, /const effectiveStatus = overrideStatus \|\| calculatedStatus/);
  assert.match(html, /row\[9\] = effectiveStatus/);
  assert.match(html, /final_status: overrideStatus[\s\S]*\? overrideStatus/);
  assert.match(html, /overrideAction\.hidden = !isAttendanceRecord \|\| isDailyProjection \|\| !canEdit/);
  assert.match(html, /if \(actionName === "override"\)[\s\S]*openAttendanceOverrideModal\(rowIndex\)/);
  assert.match(submitSource, /calculated_issue: issue/);
  assert.match(submitSource, /override_active: false/);
});

test("Pending Attendance can be marked absent before punches are entered", () => {
  assert.match(html, /preferredStatus === "Absent" && isProjectedPendingAttendance/);
  assert.match(html, /const materializingProjection = identity\.source\.projection_only === true && directAbsentAction/);
  assert.match(html, /identity\.source\.projection_only = false/);
  assert.match(html, /capture_method: materializingProjection \? "MANUAL_ABSENCE"/);
  assert.match(html, /worked_minutes: materializingProjection \? 0/);
  assert.match(html, /attendanceRecords\.push\(dashboardRecord\)/);
  assert.match(html, /persistenceTarget !== "excel"[\s\S]*applyHrmsReserve\(beforeSnapshot\)/);
});

test("selected-date attendance projects every scoped active employee without persisting placeholders", () => {
  assert.match(html, /function attendanceProjectionEntry/);
  assert.match(html, /function restoreAttendanceProjection/);
  assert.match(html, /function ensureAttendanceDateProjection/);
  assert.match(html, /function employeeActiveOnAttendanceDate/);
  assert.match(html, /hrmsScopedEmployeeRows\(\)[\s\S]*?employeeActiveOnAttendanceDate\(row, workDate\)/);
  assert.match(html, /capture_method: "SYSTEM_DAILY_PROJECTION"/);
  assert.match(html, /projection_only: true/);
  assert.match(html, /if \(source\.projection_only\) return null/);
  assert.match(html, /isDailyProjection/);
  assert.match(html, /deleteAction\.hidden = isDailyProjection \|\| !canDelete/);
});

test("closed weekly-off dates project a paid non-working day without punch or review requirements", () => {
  const contextSource = html.slice(
    html.indexOf("function attendancePublishedRosterContext"),
    html.indexOf("function attendanceLocationShiftOptions")
  );
  const projectionSource = html.slice(
    html.indexOf("function attendanceProjectionEntry"),
    html.indexOf("function restoreAttendanceProjection")
  );
  assert.match(contextSource, /WeeklyOffHolidayResolver\?\.resolveWeeklyOffContext/);
  assert.match(contextSource, /policies: employee\.location\?\.shiftPolicyRecords \|\| \[\]/);
  assert.match(contextSource, /weeklyOffContext\?\.roster_shift \|\| "Weekly Off"/);
  assert.match(projectionSource, /context\.weeklyOff[\s\S]*?"Weekly Off"/);
  assert.match(projectionSource, /attendance_shift: closedHoliday \? "Not applicable" : context\.weeklyOffContext\?\.attendance_shift \|\| ""/);
  assert.match(projectionSource, /weekly_off_basis: context\.weeklyOffContext\?\.weekly_off_basis \|\| ""/);
  assert.match(projectionSource, /requires_punch: closedHoliday \|\| context\.weeklyOff \? false/);
  assert.match(projectionSource, /pay_treatment: "PAID"/);
  assert.match(projectionSource, /review_status: "NOT_REQUIRED"/);
  assert.match(html, /details\.attendance_shift \|\| details\.roster_shift/);
});

test("deleting attendance removes only the event and restores the employee's daily register row", () => {
  const deleteSource = html.slice(
    html.indexOf("async function deleteAttendanceRecord"),
    html.indexOf("function updateConfiguredMasterValues")
  );
  assert.match(deleteSource, /config\.rows\.splice\(rowIndex, 1\)/);
  assert.match(deleteSource, /restoreAttendanceProjection\(identity\.employeeId, identity\.workDate, rowIndex\)/);
  assert.match(deleteSource, /reconcileLeaveLedgerEntries\(\)/);
  assert.match(deleteSource, /syncLeaveLedgerPage\(\)/);
  assert.match(deleteSource, /await persistHrmsDeletionOrRestore/);
  assert.match(deleteSource, /employee remains in the register with the scheduled daily status/);
  assert.match(html, /if \(source\.projection_only\) return null/);
});

test("removed attendance request screens are absent from navigation and permissions", () => {
  assert.doesNotMatch(html, /Regularization Requests|Shift Exceptions/);
  assert.doesNotMatch(html, /data-page="regularization"|data-page="shift-exceptions"/);
  assert.doesNotMatch(html, /REGULARIZATION_REQUESTS|SHIFT_EXCEPTIONS/);
});

test("attendance punches display consistently in AM PM format", () => {
  assert.match(html, /function formatAttendancePunch/);
  assert.match(html, /\[5, 6\]\.includes\(column\.rowIndex\) \? formatAttendancePunch\(cell\)/);
  assert.match(html, /<td>\$\{formatAttendancePunch\(record\.checkIn\)\}<\/td>/);
  assert.match(html, /<td>\$\{formatAttendancePunch\(record\.checkOut\)\}<\/td>/);
});
