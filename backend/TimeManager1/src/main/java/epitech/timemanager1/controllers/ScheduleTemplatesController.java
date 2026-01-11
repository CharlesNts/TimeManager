package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.ScheduleTemplateDTO;
import epitech.timemanager1.entities.ScheduleTemplate;
import epitech.timemanager1.mapper.ScheduleTemplateMapper;
import epitech.timemanager1.services.ScheduleTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedule-templates")
@RequiredArgsConstructor
public class ScheduleTemplatesController {

    private final ScheduleTemplateService templates;
    private final ScheduleTemplateMapper mapper;

    // -------- CREATE --------
    @PostMapping
    public ResponseEntity<ScheduleTemplateDTO> create(@Valid @RequestBody ScheduleTemplateDTO body) {
        ScheduleTemplate t = templates.create(
                body.getTeamId(),
                body.getName(),
                body.isActive(),
                body.getWeeklyPatternJson()
        );
        return ResponseEntity.ok(mapper.toDto(t));
    }

    // -------- ACTIVATE --------
    @PostMapping("/{id}/activate")
    public ResponseEntity<ScheduleTemplateDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(mapper.toDto(templates.activate(id)));
    }

    // -------- LIST --------
    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<ScheduleTemplateDTO>> listForTeam(@PathVariable Long teamId) {
        return ResponseEntity.ok(mapper.toDtoList(templates.listForTeam(teamId)));
    }

    // -------- UPDATE --------
    @PutMapping("/{id}")
    public ResponseEntity<ScheduleTemplateDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody ScheduleTemplateDTO body) {

        ScheduleTemplate updated = templates.update(
                id,
                body.getName(),
                body.isActive(),
                body.getWeeklyPatternJson()
        );
        return ResponseEntity.ok(mapper.toDto(updated));
    }

    // -------- DELETE --------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        templates.delete(id);
        return ResponseEntity.noContent().build();
    }
}