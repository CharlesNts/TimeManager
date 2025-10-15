package epitech.timemanager1.services;

import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.TeamMember;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.TeamMemberRepository;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TeamMemberService {

    private final TeamMemberRepository teamMembers;
    private final TeamRepository teams;
    private final UserRepository users;

    public TeamMemberService(TeamMemberRepository teamMembers, TeamRepository teams, UserRepository users) {
        this.teamMembers = teamMembers;
        this.teams = teams;
        this.users = users;
    }

    public TeamMember addMember(long teamId, long userId) {
        if (teamMembers.existsByUserIdAndTeamId(userId, teamId)) {
            throw new ConflictException("User " + userId + " already in team " + teamId);
        }
        Team team = teams.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        TeamMember tm = TeamMember.builder().team(team).user(user).build();
        // EmbeddedId is populated by @MapsId automatically
        return teamMembers.save(tm);
    }

    public void removeMember(long teamId, long userId) {
        if (!teamMembers.existsByUserIdAndTeamId(userId, teamId)) {
            throw new NotFoundException("Membership not found for user " + userId + " in team " + teamId);
        }
        teamMembers.deleteByUserIdAndTeamId(userId, teamId);
    }

    @Transactional(readOnly = true)
    public List<TeamMember> listMembers(long teamId) {
        return teamMembers.findByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public List<TeamMember> listTeams(long userId) {
        return teamMembers.findByUserId(userId);
    }
}