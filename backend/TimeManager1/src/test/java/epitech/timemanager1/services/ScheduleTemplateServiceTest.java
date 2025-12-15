package epitech.timemanager1.services;

import epitech.timemanager1.entities.ScheduleTemplate;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.ScheduleTemplateRepository;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.WorkShiftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.ZoneId;
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
    void activate_setsActiveTrue() {
        Team team = Team.builder().id(5L).name("X").build();

        ScheduleTemplate st = ScheduleTemplate.builder()
                .id(9L).team(team).name("Default").active(false).build();

        when(templates.findById(9L)).thenReturn(Optional.of(st));

        ScheduleTemplate result = svc.activate(9L);

        assertTrue(result.isActive());
    }

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

    @Test
    void generateShifts_inactiveTemplate_throwsConflict() {
        Team team = Team.builder().id(5L).name("X").build();
        ScheduleTemplate st = ScheduleTemplate.builder()
                .id(9L).team(team).name("Default").active(false).build();

        when(templates.findById(9L)).thenReturn(Optional.of(st));

        LocalDate from = LocalDate.of(2025,1,6);
        LocalDate to   = LocalDate.of(2025,1,10);

        assertThrows(ConflictException.class,
                () -> svc.generateShifts(9L, from, to, ZoneId.of("UTC")));
    }

    @Test
    void activate_setsActiveTrue_and_disablesOthers() {
        Team team = Team.builder().id(5L).name("X").build();

        ScheduleTemplate target = ScheduleTemplate.builder()
                .id(9L)
                .team(team)
                .name("Default")
                .active(false)
                .build();

        ScheduleTemplate otherActive = ScheduleTemplate.builder()
                .id(10L)
                .team(team)
                .name("Other")
                .active(true)
                .build();

        ScheduleTemplate otherInactive = ScheduleTemplate.builder()
                .id(11L)
                .team(team)
                .name("Other2")
                .active(false)
                .build();

        when(templates.findById(9L)).thenReturn(Optional.of(target));
        when(templates.findByTeamIdOrderByNameAsc(5L))
                .thenReturn(java.util.List.of(target, otherActive, otherInactive));

        // activate() calls saveAll(teamTemplates)
        when(templates.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        ScheduleTemplate result = svc.activate(9L);

        assertTrue(result.isActive());
        assertFalse(otherActive.isActive());     // should be disabled
        assertFalse(otherInactive.isActive());   // stays false

        verify(templates).saveAll(anyList());
    }

    @Test
    void deactivate_setsActiveFalse() {
        ScheduleTemplate st = ScheduleTemplate.builder()
                .id(9L).name("Default").active(true).build();

        when(templates.findById(9L)).thenReturn(Optional.of(st));

        ScheduleTemplate result = svc.deactivate(9L);

        assertFalse(result.isActive());
    }

    @Test
    void activate_notFound_throws() {
        when(templates.findById(42L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> svc.activate(42L));
    }

    @Test
    void deactivate_notFound_throws() {
        when(templates.findById(42L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> svc.deactivate(42L));
    }

    @Test
    void delete_notFound_throws() {
        when(templates.existsById(99L)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> svc.delete(99L));
    }

    @Test
    void delete_existing_delegatesToRepo() {
        when(templates.existsById(10L)).thenReturn(true);

        svc.delete(10L);

        verify(templates).deleteById(10L);
    }
}