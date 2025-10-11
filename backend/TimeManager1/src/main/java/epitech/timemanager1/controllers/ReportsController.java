package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.ReportsDTO;
import epitech.timemanager1.dto.TeamAvgHoursDTO;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.services.ClockService;
import epitech.timemanager1.services.ReportsService;
import jakarta.validation.constraints.Pattern;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@Validated
public class ReportsController {

    private final ReportsService reportsService;
    private final ClockService clockService;

    public ReportsController(ReportsService reportsService, ClockService clockService) {
        this.reportsService = reportsService;
        this.clockService = clockService;
    }

    // --------------------------------------------
    // 1) Overview report (teams avg + lateness rate)
    // --------------------------------------------
    @GetMapping("/overview")
    public ResponseEntity<ReportsDTO> overview(
            @RequestParam(name = "zone", required = false) String zoneId
    ) {
        ZoneId zone = resolveZone(zoneId);
        ReportsDTO dto = reportsService.buildReport(zone);
        return ResponseEntity.ok(dto);
    }

    // -------------------------------------------------------
    // 2) Team weekly average hours only (convenience endpoint)
    // -------------------------------------------------------
    @GetMapping("/teams/avg-hours-week")
    public ResponseEntity<List<TeamAvgHoursDTO>> teamWeeklyAverages(
            @RequestParam(name = "zone", required = false) String zoneId
    ) {
        ZoneId zone = resolveZone(zoneId);
        ReportsDTO dto = reportsService.buildReport(zone);
        return ResponseEntity.ok(dto.getTeamAvgHoursWeek());
    }

    // -------------------------------------------------------
    // 3) Is a user late on a given day? (default: today)
    //    Late = first clock-in after threshold (default 09:05)
    // -------------------------------------------------------
    @GetMapping("/users/{userId}/is-late")
    public ResponseEntity<UserLateResponse> isLate(
            @PathVariable long userId,
            @RequestParam(name = "date", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(name = "threshold", required = false, defaultValue = "09:05")
            @Pattern(regexp = "^[0-2]\\d:[0-5]\\d$", message = "threshold must be HH:mm") String threshold,
            @RequestParam(name = "zone", required = false) String zoneId
    ) {
        ZoneId zone = resolveZone(zoneId);
        LocalDate theDay = (date != null) ? date : LocalDate.now(zone);
        LocalTime thr = LocalTime.parse(threshold);

        LocalDateTime from = theDay.atStartOfDay();
        LocalDateTime to = from.plusDays(1);

        List<Clock> clocks = clockService.listForUserBetween(userId, from, to);
        Optional<Clock> first = clocks.stream()
                .min(Comparator.comparing(Clock::getClockIn));

        LocalDateTime firstIn = first.map(Clock::getClockIn).orElse(null);
        boolean late = firstIn != null && firstIn.toLocalTime().isAfter(thr);

        return ResponseEntity.ok(new UserLateResponse(userId, theDay, thr, firstIn, late));
    }

    // -----------------------------------------------------------------
    // 4) User lateness rate for a month (e.g. yearMonth=2025-10),
    //    Late = first clock-in of each day after threshold (default 09:05)
    // -----------------------------------------------------------------
    @GetMapping("/users/{userId}/lateness-rate")
    public ResponseEntity<UserLatenessRateResponse> latenessRate(
            @PathVariable long userId,
            @RequestParam(name = "yearMonth") @Pattern(
                    regexp = "^[0-9]{4}-[0-1][0-9]$", message = "yearMonth must be YYYY-MM")
            String yearMonth,
            @RequestParam(name = "threshold", required = false, defaultValue = "09:05")
            @Pattern(regexp = "^[0-2]\\d:[0-5]\\d$", message = "threshold must be HH:mm") String threshold,
            @RequestParam(name = "zone", required = false) String zoneId
    ) {
        ZoneId zone = resolveZone(zoneId);
        YearMonth ym = YearMonth.parse(yearMonth);
        LocalDateTime from = ym.atDay(1).atStartOfDay();
        LocalDateTime to = ym.plusMonths(1).atDay(1).atStartOfDay();
        LocalTime thr = LocalTime.parse(threshold);

        List<Clock> clocks = clockService.listForUserBetween(userId, from, to);

        // first clock per day
        Map<LocalDate, Clock> firstByDay = clocks.stream()
                .collect(Collectors.toMap(
                        c -> c.getClockIn().toLocalDate(),
                        c -> c,
                        (a, b) -> a.getClockIn().isBefore(b.getClockIn()) ? a : b
                ));

        long totalDays = firstByDay.size();
        long lateDays = firstByDay.values().stream()
                .filter(c -> c.getClockIn().toLocalTime().isAfter(thr))
                .count();

        double rate = totalDays == 0 ? 0.0 : (double) lateDays / totalDays;

        return ResponseEntity.ok(
                new UserLatenessRateResponse(userId, ym, thr, totalDays, lateDays, rate)
        );
    }

    // ---------------------------------------------------------
    // 5) Sum user hours in a period [from, to) (open interval)
    // ---------------------------------------------------------
    @GetMapping("/users/{userId}/hours")
    public ResponseEntity<UserHoursResponse> hoursBetween(
            @PathVariable long userId,
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(name = "zone", required = false) String zoneId
    ) {
        // zone parameter kept for symmetry; calculation uses provided instants
        List<Clock> clocks = clockService.listForUserBetween(userId, from, to);

        double hours = clocks.stream()
                .mapToDouble(c -> {
                    LocalDateTime start = max(c.getClockIn(), from);
                    LocalDateTime end = (c.getClockOut() != null ? c.getClockOut() : to);
                    end = min(end, to);
                    if (end.isBefore(start)) return 0.0;
                    return Duration.between(start, end).toMinutes() / 60d;
                })
                .sum();

        return ResponseEntity.ok(new UserHoursResponse(userId, from, to, hours));
    }

    // ------------ helpers / tiny response records -----------------

    private static ZoneId resolveZone(String zoneId) {
        if (zoneId == null || zoneId.isBlank()) return ZoneId.systemDefault();
        return ZoneId.of(zoneId);
    }

    private static LocalDateTime max(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }

    public record UserLateResponse(
            long userId,
            LocalDate date,
            LocalTime threshold,
            LocalDateTime firstClockIn,
            boolean late
    ) {}

    public record UserLatenessRateResponse(
            long userId,
            YearMonth month,
            LocalTime threshold,
            long totalDaysWithClock,
            long lateDays,
            double rate
    ) {}

    public record UserHoursResponse(
            long userId,
            LocalDateTime from,
            LocalDateTime to,
            double hours
    ) {}
}