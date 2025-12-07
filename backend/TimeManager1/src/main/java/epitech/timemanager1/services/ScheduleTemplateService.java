package epitech.timemanager1.services;

import epitech.timemanager1.entities.ScheduleTemplate;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.ScheduleTemplateRepository;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.WorkShiftRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class ScheduleTemplateService {

    private final ScheduleTemplateRepository templates;
    private final TeamRepository teams;
    private final WorkShiftRepository workShifts;

    // -------- CREATE --------
    public ScheduleTemplate create(Long teamId, String name, boolean active, String weeklyPatternJson) {
        Team team = teams.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        if (templates.existsByTeamIdAndNameIgnoreCase(teamId, name)) {
            throw new ConflictException("Template name already exists for this team");
        }
        ScheduleTemplate st = ScheduleTemplate.builder()
                .team(team)
                .name(name)
                .active(active)
                .weeklyPatternJson(weeklyPatternJson)
                .build();
        return templates.save(st);
    }

    // -------- UPDATE (new) --------
    public ScheduleTemplate update(Long templateId,
                                   String name,
                                   boolean active,
                                   String weeklyPatternJson) {

        ScheduleTemplate st = templates.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));

        // Check name uniqueness within the same team if it changed
        if (name != null && !name.equalsIgnoreCase(st.getName())) {
            if (templates.existsByTeamIdAndNameIgnoreCase(st.getTeam().getId(), name)) {
                throw new ConflictException("Template name already exists for this team");
            }
            st.setName(name);
        }

        st.setActive(active); // frontend sends desired active flag

        if (weeklyPatternJson != null) {
            st.setWeeklyPatternJson(weeklyPatternJson);
        }

        return templates.save(st); // repository.save(...)
    }

    // -------- ACTIVATE / DEACTIVATE --------
    public ScheduleTemplate activate(Long templateId) {
        ScheduleTemplate st = templates.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));
        st.setActive(true);
        return st;
    }

    public ScheduleTemplate deactivate(Long templateId) {
        ScheduleTemplate st = templates.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));
        st.setActive(false);
        return st;
    }

    /** Generate unassigned shifts from an active template into a date range. */
    public int generateShifts(Long templateId, LocalDate fromDate, LocalDate toDate, ZoneId zone) {
        ScheduleTemplate st = templates.findById(templateId)
                .orElseThrow(() -> new NotFoundException("Template not found: " + templateId));
        if (!st.isActive()) {
            throw new ConflictException("Template is not active");
        }
        if (fromDate == null || toDate == null || fromDate.isAfter(toDate)) {
            throw new ConflictException("Invalid date range");
        }

        int created = 0;
        for (LocalDate d = fromDate; !d.isAfter(toDate); d = d.plusDays(1)) {
            DayOfWeek dow = d.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                LocalDateTime start = d.atTime(9, 0);
                LocalDateTime end   = d.atTime(17, 0);
                WorkShift ws = WorkShift.builder()
                        .team(st.getTeam())
                        .startAt(start)
                        .endAt(end)
                        .note("generated from template: " + st.getName())
                        .build();
                workShifts.save(ws);
                created++;
            }
        }
        return created;
    }

    public List<ScheduleTemplate> listForTeam(Long teamId) {
        return templates.findByTeamIdOrderByNameAsc(teamId);
    }

    public void delete(Long templateId) {
        if (!templates.existsById(templateId)) {
            throw new NotFoundException("Template not found: " + templateId);
        }
        templates.deleteById(templateId);
    }
}