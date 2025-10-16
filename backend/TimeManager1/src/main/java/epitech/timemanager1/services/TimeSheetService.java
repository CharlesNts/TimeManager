package epitech.timemanager1.services;

import epitech.timemanager1.entities.LeaveRequest;
import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class TimeSheetService {

    private final WorkShiftRepository workShifts;
    private final ClockRepository clocks;
    private final LeaveRequestRepository leaves;
    private final ScheduleOverrideRepository overrides;
    private final UserRepository users;
    private final TeamRepository teams;

    // ---------- Public API ----------

    /** Timesheet for a single employee across a date window (inclusive). */
    @Transactional(Transactional.TxType.SUPPORTS)
    public EmployeeTimesheet timesheetForEmployee(Long employeeId, LocalDate from, LocalDate to, ZoneId zone) {
        if (employeeId == null) throw new IllegalArgumentException("employeeId must not be null");
        if (from == null || to == null || from.isAfter(to)) throw new IllegalArgumentException("Invalid date window");

        User user = users.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("User not found: " + employeeId));

        LocalDateTime winStart = from.atStartOfDay();
        LocalDateTime winEnd   = to.plusDays(1).atStartOfDay();

        // planned shifts
        List<WorkShift> planned = workShifts
                .findByEmployeeIdAndStartAtBetweenOrderByStartAtAsc(employeeId, winStart, winEnd);

        // clocks intersecting window (actual)
        var actualClocks = clocks.findByUserIdAndClockInBetween(employeeId, winStart, winEnd);

        // leaves that overlap any day in [from, to]
        List<LeaveRequest> leaveWindow = leaves.findForEmployeeInWindow(employeeId, from, to);

        // overrides in the window
        var overrideByDate = overrides
                .findByEmployeeIdAndDateBetweenOrderByDateAsc(employeeId, from, to)
                .stream().collect(Collectors.groupingBy(o -> o.getDate()));

        // Build per-day rows
        List<TimesheetDay> days = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            LocalDateTime dayStart = d.atStartOfDay();
            LocalDateTime dayEnd   = d.plusDays(1).atStartOfDay();

            // Planned shifts on this day
            List<WorkShift> dayShifts = planned.stream()
                    .filter(s -> intersects(s.getStartAt(), s.getEndAt(), dayStart, dayEnd))
                    .toList();

            // Actual minutes worked this day (clip by day window)
            double actualMinutes = actualClocks.stream()
                    .mapToDouble(c -> {
                        LocalDateTime start = max(c.getClockIn(), dayStart);
                        LocalDateTime out   = c.getClockOut() != null ? c.getClockOut() : dayEnd;
                        out = min(out, dayEnd);
                        return out.isAfter(start) ? Duration.between(start, out).toMinutes() : 0;
                    }).sum();

            // Leave on this day (first overlapping, prefer APPROVED over PENDING)
            LocalDate finalD = d;
            String leaveLabel = leaveWindow.stream()
                    .filter(l -> overlapsDay(l.getStartDate(), l.getEndDate(), finalD))
                    .sorted(Comparator
                            .comparing((LeaveRequest l) -> l.getStatus() != LeaveStatus.APPROVED) // APPROVED first
                            .thenComparing(LeaveRequest::getStartDate))
                    .findFirst()
                    .map(l -> l.getStatus() + " " + l.getType())
                    .orElse(null);

            // Overrides label summary
            String overrideNote = Optional.ofNullable(overrideByDate.get(d))
                    .map(list -> list.stream()
                            .map(o -> o.getField() + "=" + o.getValue())
                            .collect(Collectors.joining("; ")))
                    .orElse(null);

            days.add(new TimesheetDay(
                    d,
                    toIntervals(dayShifts),
                    round2(actualMinutes / 60.0),
                    leaveLabel,
                    overrideNote
            ));
        }

        return new EmployeeTimesheet(employeeId, user.getFirstName() + " " + user.getLastName(), from, to, zone, days);
    }

    /** Timesheet for all assigned employees in a team (grouped per employee). */
    @Transactional(Transactional.TxType.SUPPORTS)
    public TeamTimesheet timesheetForTeam(Long teamId, LocalDate from, LocalDate to, ZoneId zone) {
        if (teamId == null) throw new IllegalArgumentException("teamId must not be null");
        if (from == null || to == null || from.isAfter(to)) throw new IllegalArgumentException("Invalid date window");

        var team = teams.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        LocalDateTime winStart = from.atStartOfDay();
        LocalDateTime winEnd   = to.plusDays(1).atStartOfDay();

        // Collect all shifts for the team in the window
        List<WorkShift> teamShifts = workShifts.findByTeamIdAndStartAtBetweenOrderByStartAtAsc(teamId, winStart, winEnd);

        // Group by employee (ignore unassigned)
        Map<Long, List<WorkShift>> byEmployee = teamShifts.stream()
                .filter(s -> s.getEmployee() != null)
                .collect(Collectors.groupingBy(s -> s.getEmployee().getId()));

        // Build each employee timesheet; if you need to include users without shifts,
        // you can expand this to team membership once your team membership mapping is final.
        List<EmployeeTimesheet> employees = new ArrayList<>();
        for (var e : byEmployee.entrySet()) {
            Long employeeId = e.getKey();
            employees.add(timesheetForEmployee(employeeId, from, to, zone));
        }

        return new TeamTimesheet(teamId, team.getName(), from, to, zone, employees);
    }

    // ---------- helpers ----------

    private static boolean intersects(LocalDateTime aStart, LocalDateTime aEnd,
                                      LocalDateTime bStart, LocalDateTime bEnd) {
        return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
    }

    private static boolean overlapsDay(LocalDate start, LocalDate end, LocalDate day) {
        return !start.isAfter(day) && !end.isBefore(day);
    }

    private static LocalDateTime max(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private static List<PlannedInterval> toIntervals(List<WorkShift> shifts) {
        return shifts.stream()
                .map(s -> new PlannedInterval(s.getStartAt(), s.getEndAt(), s.getNote()))
                .toList();
    }

    // ---------- lightweight return models (records) ----------

    /** One employee’s day summary. */
    public record TimesheetDay(
            LocalDate date,
            List<PlannedInterval> planned, // from WorkShift
            double actualHours,            // from Clock (sum in hours, 2-decimal)
            String leave,                  // e.g. "APPROVED PAID" or null
            String overrides               // e.g. "location=A; special=Yes" or null
    ) {}

    /** A planned interval (shift) from the scheduler. */
    public record PlannedInterval(
            LocalDateTime startAt,
            LocalDateTime endAt,
            String note
    ) {}

    /** Timesheet view for one employee. */
    public record EmployeeTimesheet(
            Long employeeId,
            String employeeName,
            LocalDate from,
            LocalDate to,
            ZoneId zone,
            List<TimesheetDay> days
    ) {}

    /** Timesheet view for the whole team (list of employee timesheets). */
    public record TeamTimesheet(
            Long teamId,
            String teamName,
            LocalDate from,
            LocalDate to,
            ZoneId zone,
            List<EmployeeTimesheet> employees
    ) {}
}