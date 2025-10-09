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

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;
    private final TeamMapper teamMapper;

    @PostMapping
    public ResponseEntity<TeamDTO> create(@Valid @RequestBody TeamDTO dto) {
        Team toCreate = teamMapper.toEntity(dto);
        Team created = teamService.create(toCreate);
        TeamDTO out = teamMapper.toDTO(created);
        return ResponseEntity.created(URI.create("/api/teams/" + created.getId())).body(out);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeamDTO> get(@PathVariable long id) {
        Team team = teamService.get(id);
        return ResponseEntity.ok(teamMapper.toDTO(team));
    }

    /**
     * List teams managed by a specific user.
     * Call: GET /api/teams?managerId=123
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

    @PutMapping("/{id}")
    public ResponseEntity<TeamDTO> update(@PathVariable long id, @Valid @RequestBody TeamDTO dto) {
        Team patch = teamMapper.toEntity(dto);
        Team updated = teamService.update(id, patch);
        return ResponseEntity.ok(teamMapper.toDTO(updated));
    }

    @PutMapping("/{id}/manager/{userId}")
    public ResponseEntity<TeamDTO> assignManager(@PathVariable long id, @PathVariable long userId) {
        Team updated = teamService.assignManager(id, userId);
        return ResponseEntity.ok(teamMapper.toDTO(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        teamService.delete(id);
        return ResponseEntity.noContent().build();
    }
}