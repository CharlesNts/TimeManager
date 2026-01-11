package epitech.timemanager1.services;

import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock TeamRepository teamRepo;
    @Mock UserRepository userRepo;

    @InjectMocks TeamService service;

    @Test
    void create_ok() {
        Team t = Team.builder().name("Core").build();
        when(teamRepo.findByName("Core")).thenReturn(Optional.empty());
        when(teamRepo.save(t)).thenReturn(Team.builder().id(1L).name("Core").build());

        Team saved = service.create(t);

        assertNotNull(saved.getId());
        assertEquals("Core", saved.getName());
    }

    @Test
    void create_conflict_duplicate_name() {
        when(teamRepo.findByName("Core")).thenReturn(Optional.of(Team.builder().id(99L).name("Core").build()));
        assertThrows(ConflictException.class, () -> service.create(Team.builder().name("Core").build()));
        verify(teamRepo, never()).save(any());
    }

    @Test
    void get_ok() {
        when(teamRepo.findById(1L)).thenReturn(Optional.of(Team.builder().id(1L).build()));
        assertNotNull(service.get(1L));
    }

    @Test
    void get_not_found() {
        when(teamRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.get(1L));
    }

    @Test
    void update_ok_changes_fields() {
        Team existing = Team.builder().id(1L).name("Core").description("old").build();
        when(teamRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(teamRepo.findByName("Platform")).thenReturn(Optional.empty());

        Team patch = Team.builder().name("Platform").description("new").manager(User.builder().id(5L).active(true).build()).build();
        Team updated = service.update(1L, patch);

        assertEquals("Platform", updated.getName());
        assertEquals("new", updated.getDescription());
        assertEquals(5L, updated.getManager().getId());
    }

    @Test
    void update_conflict_name_taken() {
        Team existing = Team.builder().id(1L).name("Core").build();
        when(teamRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(teamRepo.findByName("Core2")).thenReturn(Optional.of(Team.builder().id(2L).name("Core2").build()));

        Team patch = Team.builder().name("Core2").build();
        assertThrows(ConflictException.class, () -> service.update(1L, patch));
    }

    @Test
    void assignManager_ok() {
        Team t = Team.builder().id(1L).build();
        when(teamRepo.findById(1L)).thenReturn(Optional.of(t));
        when(userRepo.findById(9L)).thenReturn(Optional.of(User.builder().id(9L).active(true).build()));

        Team res = service.assignManager(1L, 9L);

        assertEquals(9L, res.getManager().getId());
    }

    @Test
    void assignManager_team_or_user_missing() {
        when(teamRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.assignManager(1L, 9L));
    }

    @Test
    void delete_ok() {
        Team t = Team.builder().id(1L).build();
        when(teamRepo.findById(1L)).thenReturn(Optional.of(t));
        service.delete(1L);
        verify(teamRepo).delete(t);
    }

    @Test
    void findByManager_ok() {
        when(teamRepo.findByManagerId(5L)).thenReturn(List.of(new Team(), new Team(), new Team()));
        assertEquals(3, service.findByManager(5L).size());
    }
}