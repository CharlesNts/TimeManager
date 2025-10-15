package epitech.timemanager1.services;

import epitech.timemanager1.dto.ReportsDTO;
import epitech.timemanager1.dto.TeamAvgHoursDTO;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.User;
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

/**
 * Service responsible for generating analytical and statistical reports
 * based on user attendance and team activity.
 * <p>
 * The {@link ReportsService} aggregates data from clocks, users, and teams
 * to produce reports such as:
 * <ul>
 *   <li>Average working hours per team for the current week</li>
 *   <li>Lateness rate for all users for the current month</li>
 * </ul>
 * </p>
 */
@Service
@RequiredArgsConstructor
public class ReportsService {

    private final ClockRepository clockRepo;
    private final TeamRepository teamRepo;
    private final UserRepository userRepo;

    /**
     * Builds a complete report containing both weekly team average hours
     * and monthly lateness rate.
     *
     * @param zone the time zone used to calculate date and time ranges
     * @return a {@link ReportsDTO} containing aggregated statistics
     */
    public ReportsDTO buildReport(ZoneId zone) {
        ZonedDateTime now = ZonedDateTime.now(zone);

        // Define weekly range (Monday -> Monday)
        LocalDateTime weekStart = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                .toLocalDate().atStartOfDay();
        LocalDateTime weekEnd = weekStart.plusWeeks(1);

        // Define monthly range (1st -> next month’s 1st)
        LocalDateTime monthStart = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime monthEnd = monthStart.plusMonths(1);

        // --- Weekly hours calculation ---
        List<Clock> clocksWeek = clockRepo.findAllBetweenFetchUser(weekStart, weekEnd);

        Map<Long, Double> userHours = clocksWeek.stream()
                .collect(Collectors.groupingBy(c -> c.getUser().getId(),
                        Collectors.summingDouble(c -> {
                            LocalDateTime out = c.getClockOut() != null ? c.getClockOut() : now.toLocalDateTime();
                            return Duration.between(c.getClockIn(), out).toMinutes() / 60d;
                        })
                ));

        // --- Compute team averages ---
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

        // --- Monthly lateness rate calculation ---
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

        // --- Build and return the final report ---
        return ReportsDTO.builder()
                .teamAvgHoursWeek(teamAvg.stream()
                        .sorted(Comparator.comparing(TeamAvgHoursDTO::getTeamName))
                        .toList())
                .latenessRateMonth(latenessRate)
                .build();
    }
}