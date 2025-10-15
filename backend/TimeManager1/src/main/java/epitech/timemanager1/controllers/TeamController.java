package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.TeamDTO;
import epitech.timemanager1.entities.Team;
import epitech.timemanager1.mapper.TeamMapper;
import epitech.timemanager1.services.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

/**
 * REST controller for managing {@link Team} entities.
 * <p>
 * Provides endpoints for creating, retrieving, updating, and deleting teams,
 * as well as assigning managers and listing teams by manager.
 * </p>
 */
@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    /** Service layer for business logic related to teams. */
    private final TeamService teamService;

    /** Mapper used to convert between {@link Team} and {@link TeamDTO}. */
    private final TeamMapper teamMapper;

    /**
     * Creates a new team.
     *
     * @param dto the team data to create
     * @return the created {@link TeamDTO} with HTTP 201 status and Location header
     */
    @PostMapping
    public ResponseEntity<TeamDTO> create(@Valid @RequestBody TeamDTO dto) {
        Team toCreate = teamMapper.toEntity(dto);
        Team created = teamService.create(toCreate);
        TeamDTO out = teamMapper.toDTO(created);
        return ResponseEntity.created(URI.create("/api/teams/" + created.getId())).body(out);
    }

    /**
     * Retrieves a team by its ID.
     *
     * @param id the ID of the team
     * @return the {@link TeamDTO} for the specified ID with HTTP 200 status
     */
    @GetMapping("/{id}")
    public ResponseEntity<TeamDTO> get(@PathVariable long id) {
        Team team = teamService.get(id);
        return ResponseEntity.ok(teamMapper.toDTO(team));
    }

    /**
     * Lists teams managed by a specific user.
     * <p>
     * Example: {@code GET /api/teams?managerId=123}
     * </p>
     *
     * @param managerId the ID of the manager (optional)
     * @return list of {@link TeamDTO} managed by the specified user;
     *         empty list if {@code managerId} is null
     */
    @GetMapping
    public ResponseEntity<List<TeamDTO>> listByManager(@RequestParam(required = false) Long managerId) {
        if (managerId == null) {
            // If you later add a listAll() in TeamService, swap this to use it.
            // For now, return empty to avoid calling repository directly from controller.
            return ResponseEntity.ok(List.of());
        }
        List<Team> teams = teamService.findByManager(managerId);
        return ResponseEntity.ok(teamMapper.toDTOs(teams));
    }

    /**
     * Updates an existing team.
     *
     * @param id  the ID of the team to update
     * @param dto the updated team data
     * @return the updated {@link TeamDTO} with HTTP 200 status
     */
    @PutMapping("/{id}")
    public ResponseEntity<TeamDTO> update(@PathVariable long id, @Valid @RequestBody TeamDTO dto) {
        Team patch = teamMapper.toEntity(dto);
        Team updated = teamService.update(id, patch);
        return ResponseEntity.ok(teamMapper.toDTO(updated));
    }

    /**
     * Assigns a new manager to a team.
     *
     * @param id     the ID of the team
     * @param userId the ID of the user to assign as manager
     * @return the updated {@link TeamDTO} after assigning the manager
     */
    @PutMapping("/{id}/manager/{userId}")
    public ResponseEntity<TeamDTO> assignManager(@PathVariable long id, @PathVariable long userId) {
        Team updated = teamService.assignManager(id, userId);
        return ResponseEntity.ok(teamMapper.toDTO(updated));
    }

    /**
     * Deletes a team by its ID.
     *
     * @param id the ID of the team to delete
     * @return {@code 204 No Content} upon successful deletion
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        teamService.delete(id);
        return ResponseEntity.noContent().build();
    }
}