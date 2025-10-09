package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.ClockDTO;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.mapper.ClockMapper;
import epitech.timemanager1.services.ClockService;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/users/{userId}/clocks")
@RequiredArgsConstructor
public class ClockController {

    private final ClockService clockService;
    private final ClockMapper clockMapper;

    /**
     * Clock-in the user now (or at a provided time).
     * Example:
     * POST /api/users/5/clocks/in
     * POST /api/users/5/clocks/in?when=2025-10-08T09:00:00
     */
    @PostMapping("/in")
    public ResponseEntity<ClockDTO> clockIn(
            @PathVariable long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime when
    ) {
        Clock created = clockService.clockIn(userId, when);
        ClockDTO dto = clockMapper.toDTO(created);
        return ResponseEntity
                .created(URI.create("/api/users/" + userId + "/clocks/" + created.getId()))
                .body(dto);
    }

    /**
     * Clock-out the last open session (now or at a provided time).
     * Example:
     * POST /api/users/5/clocks/out
     * POST /api/users/5/clocks/out?when=2025-10-08T17:30:00
     */
    @PostMapping("/out")
    public ResponseEntity<ClockDTO> clockOut(
            @PathVariable long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime when
    ) {
        Clock updated = clockService.clockOut(userId, when);
        return ResponseEntity.ok(clockMapper.toDTO(updated));
    }

    /**
     * Page through all clock entries for a user.
     * Example:
     * GET /api/users/5/clocks?page=0&size=20&sort=clockIn,desc
     */
    @GetMapping
    public ResponseEntity<Page<ClockDTO>> listForUser(
            @PathVariable long userId,
            Pageable pageable
    ) {
        Page<Clock> page = clockService.listForUser(userId, pageable);
        return ResponseEntity.ok(page.map(clockMapper::toDTO));
    }

    /**
     * List entries between two datetimes (inclusive).
     * Example:
     * GET /api/users/5/clocks/range?from=2025-10-01T00:00:00&to=2025-10-31T23:59:59
     */
    @GetMapping("/range")
    public ResponseEntity<List<ClockDTO>> listForUserBetween(
            @PathVariable long userId,
            @RequestParam @NotNull
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @NotNull
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        List<Clock> clocks = clockService.listForUserBetween(userId, from, to);
        return ResponseEntity.ok(clockMapper.toDTOs(clocks));
    }
}