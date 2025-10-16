package epitech.timemanager1.services;

import epitech.timemanager1.entities.ScheduleTemplate;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.repositories.ScheduleTemplateRepository;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.WorkShiftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduleTemplateServiceTest {

    @Mock ScheduleTemplateRepository templates;
    @Mock TeamRepository teams;
    @Mock WorkShiftRepository workShifts;

    @InjectMocks ScheduleTemplateService svc;

    @Test
    void create_duplicateName_throws() {
        when(teams.findById(5L)).thenReturn(Optional.of(Team.builder().id(5L).name("X").build()));
        when(templates.existsByTeamIdAndNameIgnoreCase(5L, "Default")).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> svc.create(5L, "Default", true, null));
    }

    @Test
    void generateShifts_weekdays_only() {
        Team team = Team.builder().id(5L).name("X").build();
        ScheduleTemplate st = ScheduleTemplate.builder()
                .id(9L).team(team).name("Default").active(true).build();

        when(templates.findById(9L)).thenReturn(Optional.of(st));
        when(workShifts.save(any(WorkShift.class))).thenAnswer(inv -> inv.getArgument(0));

        LocalDate from = LocalDate.of(2025,1,6);   // Monday
        LocalDate to   = LocalDate.of(2025,1,10);  // Friday

        int created = svc.generateShifts(9L, from, to, ZoneId.of("UTC"));
        assertEquals(5, created); // Mon..Fri
    }
}