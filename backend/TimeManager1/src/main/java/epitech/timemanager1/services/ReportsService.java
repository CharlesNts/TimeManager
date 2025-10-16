package epitech.timemanager1.services;

import epitech.timemanager1.dto.ReportsDTO;
import epitech.timemanager1.dto.TeamAvgHoursDTO;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.repositories.ClockRepository;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

import static java.time.DayOfWeek.MONDAY;

@Service
@RequiredArgsConstructor
public class ReportsService {

    private final ClockRepository clockRepo;
    private final TeamRepository teamRepo;
    private final UserRepository userRepo;

    public ReportsDTO buildReport(ZoneId zone) {
        ZonedDateTime nowZ = ZonedDateTime.now(zone);

        // Weekly range [Mon 00:00, next Mon 00:00)
        LocalDateTime weekStart = nowZ.with(TemporalAdjusters.previousOrSame(MONDAY))
                .toLocalDate().atStartOfDay();
        LocalDateTime weekEnd = weekStart.plusWeeks(1);

        // Monthly range [1st 00:00, next month 1st 00:00)
        LocalDateTime monthStart = nowZ.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);

        // --- Weekly hours (pause-aware, clamped to [weekStart, weekEnd]) ---
        //List<Clock> clocksWeek = clockRepo.findAllBetweenFetchUser(weekStart, weekEnd);

        List<Clock> clocksWeek = clockRepo.findAllBetweenFetchUserWithPauses(weekStart, weekEnd);

        Map<Long, Double> userHours = clocksWeek.stream()
                .collect(Collectors.groupingBy(c -> c.getUser().getId(),
                        Collectors.summingDouble(c -> {
                            LocalDateTime start = max(c.getClockIn(), weekStart);
                            LocalDateTime end   = min(c.getClockOut() != null ? c.getClockOut() : nowZ.toLocalDateTime(),
                                    weekEnd);
                            if (end.isBefore(start)) return 0.0;

                            long grossMin = Duration.between(start, end).toMinutes();

                            long pauseMin = (c.getPauses() == null ? 0L :
                                    c.getPauses().stream()
                                            .mapToLong(p -> {
                                                LocalDateTime ps = max(p.getStartAt(), start);
                                                LocalDateTime pe = min(p.getEndAt(), end);
                                                return pe.isAfter(ps) ? Duration.between(ps, pe).toMinutes() : 0L;
                                            })
                                            .sum());

                            long netMin = Math.max(0, grossMin - pauseMin);
                            return netMin / 60d;
                        })
                ));

        // --- Compute team averages (same as before) ---
        List<TeamAvgHoursDTO> teamAvg = new ArrayList<>();
        for (Team t : teamRepo.findAllWithMembers()) {
            var members = t.getMembers();
            if (members == null || members.isEmpty()) continue;

            double sum = members.stream()
                    .mapToDouble(u -> userHours.getOrDefault(u.getId(), 0.0))
                    .sum();

            double avg = sum / members.size();
            teamAvg.add(TeamAvgHoursDTO.builder()
                    .teamId(t.getId())
                    .teamName(t.getName())
                    .avgHours(avg)
                    .build());
        }

        // --- Monthly lateness rate (unchanged; pauses don’t affect first clock-in time) ---
        List<Clock> clocksMonth = clockRepo.findAllBetweenFetchUser(monthStart, monthEnd);
        Map<Map.Entry<Long, LocalDate>, Clock> firstClockByUserDay = clocksMonth.stream()
                .collect(Collectors.toMap(
                        c -> Map.entry(c.getUser().getId(), c.getClockIn().toLocalDate()),
                        c -> c,
                        (a, b) -> a.getClockIn().isBefore(b.getClockIn()) ? a : b
                ));

        long totalDaysWithClock = firstClockByUserDay.size();
        long lateCount = firstClockByUserDay.values().stream()
                .filter(c -> c.getClockIn().toLocalTime().isAfter(LocalTime.of(9, 5)))
                .count();

        double latenessRate = totalDaysWithClock == 0 ? 0.0 : (double) lateCount / totalDaysWithClock;

        return ReportsDTO.builder()
                .teamAvgHoursWeek(teamAvg.stream()
                        .sorted(Comparator.comparing(TeamAvgHoursDTO::getTeamName))
                        .toList())
                .latenessRateMonth(latenessRate)
                .build();
    }

    private static LocalDateTime max(LocalDateTime a, LocalDateTime b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalDateTime min(LocalDateTime a, LocalDateTime b) {
        return a.isBefore(b) ? a : b;
    }
}