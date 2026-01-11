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

/**
 * Service responsible for managing the relationships between teams and users.
 * <p>
 * Provides operations for:
 * <ul>
 *   <li>Adding users to teams</li>
 *   <li>Removing users from teams</li>
 *   <li>Listing team members</li>
 *   <li>Listing teams a user belongs to</li>
 * </ul>
 * </p>
 */
@Service
@Transactional
public class TeamMemberService {

    private final TeamMemberRepository teamMembers;
    private final TeamRepository teams;
    private final UserRepository users;

    /**
     * Constructs a new {@link TeamMemberService} with the given repositories.
     *
     * @param teamMembers the repository managing {@link TeamMember} entities
     * @param teams       the repository managing {@link Team} entities
     * @param users       the repository managing {@link User} entities
     */
    public TeamMemberService(TeamMemberRepository teamMembers, TeamRepository teams, UserRepository users) {
        this.teamMembers = teamMembers;
        this.teams = teams;
        this.users = users;
    }

    /**
     * Adds a user to a specific team.
     * <p>
     * Throws a {@link ConflictException} if the user is already a member of the team.
     * </p>
     *
     * @param teamId the ID of the team
     * @param userId the ID of the user to add
     * @return the newly created {@link TeamMember} entity
     * @throws NotFoundException   if the team or user does not exist
     * @throws ConflictException   if the user is already part of the team
     */
    public TeamMember addMember(long teamId, long userId) {
        if (teamMembers.existsByUserIdAndTeamId(userId, teamId)) {
            throw new ConflictException("User " + userId + " already in team " + teamId);
        }
        Team team = teams.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        TeamMember tm = TeamMember.builder().team(team).user(user).build();
        // EmbeddedId is populated automatically by @MapsId
        return teamMembers.save(tm);
    }

    /**
     * Removes a user from a team.
     *
     * @param teamId the ID of the team
     * @param userId the ID of the user to remove
     * @throws NotFoundException if the membership does not exist
     */
    public void removeMember(long teamId, long userId) {
        if (!teamMembers.existsByUserIdAndTeamId(userId, teamId)) {
            throw new NotFoundException("Membership not found for user " + userId + " in team " + teamId);
        }
        teamMembers.deleteByUserIdAndTeamId(userId, teamId);
    }

    /**
     * Lists all members of a given team.
     *
     * @param teamId the ID of the team
     * @return a list of {@link TeamMember} entities representing team members
     */
    @Transactional(readOnly = true)
    public List<TeamMember> listMembers(long teamId) {
        return teamMembers.findByTeamId(teamId);
    }

    /**
     * Lists all teams that a given user belongs to.
     *
     * @param userId the ID of the user
     * @return a list of {@link TeamMember} entities representing user-team relationships
     */
    @Transactional(readOnly = true)
    public List<TeamMember> listTeams(long userId) {
        return teamMembers.findByUserId(userId);
    }
}