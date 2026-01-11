package epitech.timemanager1.services;

import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import epitech.timemanager1.repositories.WorkShiftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkShiftServiceTest {

    @Mock WorkShiftRepository repo;
    @Mock TeamRepository teams;
    @Mock UserRepository users;

    @InjectMocks WorkShiftService svc;

    // ---------- Utility methods ----------

    private static Team team(long id) {
        Team t = new Team();
        t.setId(id);
        t.setName("Team-" + id);
        return t;
    }

    private static User user(long id) {
        User u = new User();
        u.setId(id);
        u.setEmail("user" + id + "@test.com");
        u.setPassword("pwd");
        u.setRole(Role.EMPLOYEE);
        u.setActive(true);
        u.setFirstName("User" + id);
        u.setLastName("Test");
        return u;
    }

    private static WorkShift shift(long id, Team t, User u, LocalDateTime start, LocalDateTime end) {
        WorkShift s = new WorkShift();
        s.setId(id);
        s.setTeam(t);
        s.setEmployee(u);
        s.setStartAt(start);
        s.setEndAt(end);
        s.setNote("test-shift");
        return s;
    }

    // ---------- Tests ----------

    @Test
    void create_withEmployee_noOverlap_succeeds() {
        Team t = team(7L);
        User u = user(11L);
        LocalDateTime start = LocalDateTime.of(2025, 1, 10, 9, 0);
        LocalDateTime end = LocalDateTime.of(2025, 1, 10, 17, 0);

        when(teams.findById(7L)).thenReturn(Optional.of(t));
        when(users.findById(11L)).thenReturn(Optional.of(u));
        when(repo.existsOverlapForEmployee(11L, start, end)).thenReturn(false);
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WorkShift ws = svc.create(7L, 11L, start, end, "HQ", "note");

        assertEquals(t, ws.getTeam());
        assertEquals(u, ws.getEmployee());
        assertEquals(start, ws.getStartAt());
        assertEquals(end, ws.getEndAt());
        assertNotNull(ws.getNote());
        assertTrue(ws.getNote().contains("location: HQ"));
    }

    @Test
    void create_invalidWindow_throws() {
        LocalDateTime start = LocalDateTime.of(2025, 1, 10, 17, 0);
        LocalDateTime end   = LocalDateTime.of(2025, 1, 10,  9, 0);

        assertThrows(ConflictException.class,
                () -> svc.create(7L, null, start, end, null, null));
    }

    @Test
    void create_teamNotFound_throws() {
        when(teams.findById(7L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> svc.create(7L, null,
                        LocalDateTime.of(2025, 1, 10, 9, 0),
                        LocalDateTime.of(2025, 1, 10, 17, 0),
                        null, null));
    }

    @Test
    void create_employeeNotFound_throws() {
        Team t = team(7L);
        when(teams.findById(7L)).thenReturn(Optional.of(t));
        when(users.findById(11L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class,
                () -> svc.create(7L, 11L,
                        LocalDateTime.of(2025, 1, 10, 9, 0),
                        LocalDateTime.of(2025, 1, 10, 17, 0),
                        null, null));
    }

    @Test
    void assignEmployee_overlap_throws() {
        Team t = team(5L);
        WorkShift ws = shift(1L, t, null,
                LocalDateTime.of(2025, 1, 11, 9, 0),
                LocalDateTime.of(2025, 1, 11, 17, 0));
        User u = user(33L);

        when(repo.findById(1L)).thenReturn(Optional.of(ws));
        when(users.findById(33L)).thenReturn(Optional.of(u));

        // IMPORTANT: assignEmployee() uses the EXCLUDING-ID overlap check
        when(repo.existsOverlapForEmployeeExcludingId(
                33L, 1L, ws.getStartAt(), ws.getEndAt()
        )).thenReturn(true);

        assertThrows(ConflictException.class, () -> svc.assignEmployee(1L, 33L));
    }

    @Test
    void assignEmployee_valid_setsEmployee() {
        Team t = team(5L);
        WorkShift ws = shift(1L, t, null,
                LocalDateTime.of(2025, 1, 11, 9, 0),
                LocalDateTime.of(2025, 1, 11, 17, 0));
        User u = user(33L);

        when(repo.findById(1L)).thenReturn(Optional.of(ws));
        when(users.findById(33L)).thenReturn(Optional.of(u));

        when(repo.existsOverlapForEmployeeExcludingId(
                33L, 1L, ws.getStartAt(), ws.getEndAt()
        )).thenReturn(false);

        WorkShift result = svc.assignEmployee(1L, 33L);

        assertEquals(u, result.getEmployee());
    }

    @Test
    void assignEmployee_shiftNotFound_throws() {
        when(repo.findById(1L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> svc.assignEmployee(1L, 33L));
    }

    @Test
    void assignEmployee_userNotFound_throws() {
        Team t = team(5L);
        WorkShift ws = shift(1L, t, null,
                LocalDateTime.of(2025, 1, 11, 9, 0),
                LocalDateTime.of(2025, 1, 11, 17, 0));

        when(repo.findById(1L)).thenReturn(Optional.of(ws));
        when(users.findById(33L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> svc.assignEmployee(1L, 33L));
    }

    @Test
    void unassignEmployee_setsNull() {
        Team t = team(2L);
        User u = user(10L);
        WorkShift ws = shift(1L, t, u,
                LocalDateTime.of(2025, 1, 10, 9, 0),
                LocalDateTime.of(2025, 1, 10, 17, 0));

        when(repo.findById(1L)).thenReturn(Optional.of(ws));

        WorkShift result = svc.unassignEmployee(1L);

        assertNull(result.getEmployee());
    }

    @Test
    void unassignEmployee_missing_throws() {
        when(repo.findById(1L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> svc.unassignEmployee(1L));
    }

    @Test
    void delete_missing_throws() {
        when(repo.existsById(999L)).thenReturn(false);

        assertThrows(NotFoundException.class, () -> svc.delete(999L));
    }

    @Test
    void delete_existing_ok() {
        when(repo.existsById(5L)).thenReturn(true);

        svc.delete(5L);

        verify(repo).deleteById(5L);
    }
}