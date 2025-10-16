package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.TeamMemberDTO;
import epitech.timemanager1.entities.TeamMember;
import epitech.timemanager1.mapper.TeamMemberMapper;
import epitech.timemanager1.services.TeamMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * REST controller for managing team memberships.
 * <p>
 * Provides endpoints to:
 * <ul>
 *   <li>Add a user to a team</li>
 *   <li>Remove a user from a team</li>
 *   <li>List all members of a team</li>
 *   <li>List all teams a user belongs to</li>
 * </ul>
 * </p>
 */
@RestController
@RequiredArgsConstructor
public class TeamMemberController {

    /** Service handling business logic for team memberships. */
    private final TeamMemberService teamMemberService;

    /** Mapper used to convert between {@link TeamMember} and {@link TeamMemberDTO}. */
    private final TeamMemberMapper teamMemberMapper;

    /**
     * Adds a user to a team.
     *
     * @param teamId the ID of the team
     * @param userId the ID of the user to add
     * @return the created {@link TeamMemberDTO} with HTTP 201 status
     */
    @PostMapping("/api/teams/{teamId}/members/{userId}")
    public ResponseEntity<TeamMemberDTO> addMember(@PathVariable long teamId, @PathVariable long userId) {
        TeamMember created = teamMemberService.addMember(teamId, userId);
        TeamMemberDTO out = teamMemberMapper.toDTO(created);
        return ResponseEntity
                .created(URI.create("/api/teams/" + teamId + "/members/" + userId))
                .body(out);
    }

    /**
     * Removes a user from a team.
     *
     * @param teamId the ID of the team
     * @param userId the ID of the user to remove
     * @return {@code 204 No Content} after successful removal
     */
    @DeleteMapping("/api/teams/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable long teamId, @PathVariable long userId) {
        teamMemberService.removeMember(teamId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lists all members of a given team.
     *
     * @param teamId the ID of the team
     * @return list of {@link TeamMemberDTO} representing the team members
     */
    @GetMapping("/api/teams/{teamId}/members")
    public ResponseEntity<List<TeamMemberDTO>> listMembers(@PathVariable long teamId) {
        List<TeamMember> members = teamMemberService.listMembers(teamId);
        return ResponseEntity.ok(teamMemberMapper.toDTOs(members));
    }

    /**
     * Lists all teams a specific user belongs to.
     *
     * @param userId the ID of the user
     * @return list of {@link TeamMemberDTO} representing the user's team memberships
     */
    @GetMapping("/api/users/{userId}/teams")
    public ResponseEntity<List<TeamMemberDTO>> listTeams(@PathVariable long userId) {
        List<TeamMember> rows = teamMemberService.listTeams(userId);
        return ResponseEntity.ok(teamMemberMapper.toDTOs(rows));
    }
}