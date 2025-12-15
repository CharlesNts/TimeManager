package epitech.timemanager1.services;

import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.TeamMember;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.TeamMemberRepository;
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
class TeamMemberServiceTest {

    @Mock TeamMemberRepository tmRepo;
    @Mock TeamRepository teamRepo;
    @Mock UserRepository userRepo;

    @InjectMocks TeamMemberService service;

    @Test
    void addMember_ok() {
        when(tmRepo.existsByUserIdAndTeamId(2L, 1L)).thenReturn(false);
        Team team = Team.builder().id(1L).name("Core").build();
        User user = User.builder().id(2L).email("x@y.z").password("p").active(true).build();
        when(teamRepo.findById(1L)).thenReturn(Optional.of(team));
        when(userRepo.findById(2L)).thenReturn(Optional.of(user));
        when(tmRepo.save(any(TeamMember.class))).thenAnswer(inv -> {
            TeamMember tm = inv.getArgument(0);
            tm.setId(new TeamMember.Id(user.getId(), team.getId()));
            return tm;
        });

        TeamMember created = service.addMember(1L, 2L);

        assertNotNull(created.getId());
        assertEquals(2L, created.getId().getUserId());
        assertEquals(1L, created.getId().getTeamId());
        assertEquals(team, created.getTeam());
        assertEquals(user, created.getUser());
    }

    @Test
    void addMember_conflict_if_already_member() {
        when(tmRepo.existsByUserIdAndTeamId(2L, 1L)).thenReturn(true);
        assertThrows(ConflictException.class, () -> service.addMember(1L, 2L));
        verify(tmRepo, never()).save(any());
    }

    @Test
    void addMember_team_not_found() {
        when(tmRepo.existsByUserIdAndTeamId(2L, 1L)).thenReturn(false);
        when(teamRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.addMember(1L, 2L));
    }

    @Test
    void addMember_user_not_found() {
        when(tmRepo.existsByUserIdAndTeamId(2L, 1L)).thenReturn(false);
        when(teamRepo.findById(1L)).thenReturn(Optional.of(Team.builder().id(1L).build()));
        when(userRepo.findById(2L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.addMember(1L, 2L));
    }

    @Test
    void removeMember_ok() {
        when(tmRepo.existsByUserIdAndTeamId(2L, 1L)).thenReturn(true);
        service.removeMember(1L, 2L);
        verify(tmRepo).deleteByUserIdAndTeamId(2L, 1L);
    }

    @Test
    void removeMember_not_found() {
        when(tmRepo.existsByUserIdAndTeamId(2L, 1L)).thenReturn(false);
        assertThrows(NotFoundException.class, () -> service.removeMember(1L, 2L));
    }

    @Test
    void listMembers_ok() {
        when(tmRepo.findByTeamId(1L)).thenReturn(List.of(new TeamMember(), new TeamMember()));
        assertEquals(2, service.listMembers(1L).size());
    }

    @Test
    void listTeams_ok() {
        when(tmRepo.findByUserId(2L)).thenReturn(List.of(new TeamMember()));
        assertEquals(1, service.listTeams(2L).size());
    }
}