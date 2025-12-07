package epitech.timemanager1.controllers;

import epitech.timemanager1.entities.ClockPause;
import epitech.timemanager1.services.ClockPauseService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/clocks/{clockId}/pauses")
@RequiredArgsConstructor
public class ClockPausesController {

    private final ClockPauseService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClockPause create(@PathVariable Long clockId,
            @RequestBody CreateRequest body) {
        return service.create(clockId, body.startAt(), body.endAt(), body.note());
    }

    @GetMapping
    public List<ClockPause> list(@PathVariable Long clockId) {
        return service.listForClock(clockId);
    }

    @PatchMapping("/{pauseId}")
    public ClockPause update(@PathVariable Long clockId,
            @PathVariable Long pauseId,
            @RequestBody UpdateRequest body) {
        return service.update(pauseId, body.startAt(), body.endAt(), body.note());
    }

    @DeleteMapping("/{pauseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long clockId, @PathVariable Long pauseId) {
        service.delete(pauseId);
    }

    // --- DTOs ---
    public record CreateRequest(
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startAt,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endAt,
            String note) {
    }

    public record UpdateRequest(
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startAt,
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endAt,
            String note) {
    }
}