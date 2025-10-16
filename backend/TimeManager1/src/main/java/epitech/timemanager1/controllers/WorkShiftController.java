package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.WorkShiftDTO;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.mapper.WorkShiftMapper;
import epitech.timemanager1.services.WorkShiftService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/workshifts")
@RequiredArgsConstructor
@Validated
public class WorkShiftController {

    private final WorkShiftService workShiftService;
    private final WorkShiftMapper mapper;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkShiftDTO create(@Valid @RequestBody CreateRequest body) {
        WorkShift ws = workShiftService.create(
                body.teamId(),
                body.employeeId(),
                body.startAt(),
                body.endAt(),
                body.location(),
                body.note()
        );
        return mapper.toDto(ws);
    }

    @PatchMapping("/{id}")
    public WorkShiftDTO update(@PathVariable Long id, @Valid @RequestBody UpdateRequest body) {
        WorkShift ws = workShiftService.update(
                id,
                body.employeeId(),
                body.startAt(),
                body.endAt(),
                body.location(),
                body.note()
        );
        return mapper.toDto(ws);
    }

    @PatchMapping("/{id}/assign")
    public WorkShiftDTO assign(@PathVariable Long id, @Valid @RequestBody AssignRequest body) {
        return mapper.toDto(workShiftService.assignEmployee(id, body.employeeId()));
    }

    @PatchMapping("/{id}/unassign")
    public WorkShiftDTO unassign(@PathVariable Long id) {
        return mapper.toDto(workShiftService.unassignEmployee(id));
    }

    @GetMapping("/team/{teamId}")
    public List<WorkShiftDTO> listForTeam(
            @PathVariable Long teamId,
            @RequestParam @NotNull
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @NotNull
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        return mapper.toDtoList(workShiftService.listTeamShifts(teamId, from, to));
    }

    @GetMapping("/employee/{employeeId}")
    public List<WorkShiftDTO> listForEmployee(
            @PathVariable Long employeeId,
            @RequestParam @NotNull
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @NotNull
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        return mapper.toDtoList(workShiftService.listEmployeeShifts(employeeId, from, to));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        workShiftService.delete(id);
    }

    // ---- payloads ----
    public record CreateRequest(
            @NotNull Long teamId,
            Long employeeId,
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startAt,
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endAt,
            String location,
            String note
    ) {}

    public record UpdateRequest(
            Long employeeId,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startAt,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endAt,
            String location,
            String note
    ) {}

    public record AssignRequest(@NotNull Long employeeId) {}
}