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

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TeamMemberController {

    private final TeamMemberService teamMemberService;
    private final TeamMemberMapper teamMemberMapper;

    /** Add a user to a team */
    @PostMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<TeamMemberDTO> addMember(@PathVariable long teamId, @PathVariable long userId) {
        TeamMember created = teamMemberService.addMember(teamId, userId);
        TeamMemberDTO dto = teamMemberMapper.toDTO(created);
        return ResponseEntity
                .created(URI.create("/api/teams/" + teamId + "/members/" + userId))
                .body(dto);
    }

    /** Remove a user from a team */
    @DeleteMapping("/teams/{teamId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable long teamId, @PathVariable long userId) {
        teamMemberService.removeMember(teamId, userId);
        return ResponseEntity.noContent().build();
    }

    /** List members of a team */
    @GetMapping("/teams/{teamId}/members")
    public ResponseEntity<List<TeamMemberDTO>> listMembers(@PathVariable long teamId) {
        List<TeamMember> members = teamMemberService.listMembers(teamId);
        return ResponseEntity.ok(teamMemberMapper.toDTOs(members));
    }

    /** List the teams a user belongs to (returns memberships) */
    @GetMapping("/users/{userId}/teams")
    public ResponseEntity<List<TeamMemberDTO>> listTeamsForUser(@PathVariable long userId) {
        List<TeamMember> memberships = teamMemberService.listTeams(userId);
        return ResponseEntity.ok(teamMemberMapper.toDTOs(memberships));
    }
}