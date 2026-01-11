package epitech.timemanager1.services;

import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.ClockPause;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.ClockPauseRepository;
import epitech.timemanager1.repositories.ClockRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class ClockPauseService {

    private final ClockRepository clocks;
    private final ClockPauseRepository pauses;

    public ClockPause create(Long clockId,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String note) {

        Clock c = clocks.findById(clockId)
                .orElseThrow(() -> new NotFoundException("Clock not found: " + clockId));

        if (startAt == null) {
            throw new ConflictException("startAt is required");
        }

        LocalDateTime in = c.getClockIn();
        LocalDateTime out = c.getClockOut();

        if (in == null) {
            throw new ConflictException("Clock has no clockIn");
        }

        if (endAt != null) {
            if (!startAt.isBefore(endAt)) {
                throw new ConflictException("Invalid pause window");
            }

            if (out != null && (startAt.isBefore(in) || endAt.isAfter(out))) {
                throw new ConflictException("Pause must be inside the clock-in/out interval");
            }

            if (pauses.existsOverlap(clockId, startAt, endAt)) {
                throw new ConflictException("Pause overlaps an existing pause");
            }
        } else {
            if (pauses.existsByClockIdAndEndAtIsNull(clockId)) {
                throw new ConflictException("There is already an open pause for this clock");
            }

            if (startAt.isBefore(in) || (out != null && startAt.isAfter(out))) {
                throw new ConflictException("Pause must be inside the clock-in/out interval");
            }
        }

        ClockPause p = ClockPause.builder()
                .clock(c)
                .startAt(startAt)
                .endAt(endAt) // null if open
                .note(note)
                .build();

        return pauses.save(p);
    }

    public ClockPause update(Long clockId,
                             Long pauseId,
                             LocalDateTime startAt,
                             LocalDateTime endAt,
                             String note) {

        // 1) Ensure the pause belongs to the clock in the URL
        if (!pauses.existsByIdAndClockId(pauseId, clockId)) {
            throw new NotFoundException("Pause " + pauseId + " not found for clock " + clockId);
        }

        ClockPause p = pauses.findById(pauseId)
                .orElseThrow(() -> new NotFoundException("Pause not found: " + pauseId));

        Clock c = p.getClock(); // should be the same clockId by now
        if (c.getClockIn() == null) {
            throw new ConflictException("Clock has no clockIn");
        }

        // 2) Determine the target values (partial update)
        LocalDateTime newStart = (startAt != null) ? startAt : p.getStartAt();
        LocalDateTime newEnd   = (endAt   != null) ? endAt   : p.getEndAt();

        // If caller provides ONLY note and doesn’t touch times, it’s allowed
        boolean touchingTimes = (startAt != null) || (endAt != null);

        // 3) If times are being touched, validate them
        if (touchingTimes) {
            if (newStart == null) {
                throw new ConflictException("startAt is required");
            }

            // Allow open pause (end null) if clock session is still open,
            // but do not allow making it open if there is already another open pause
            if (newEnd == null) {
                // If you want to allow "re-open" explicitly, keep this.
                // Otherwise you can require endAt to close only.
                boolean anotherOpenExists = pauses.existsByClockIdAndEndAtIsNull(clockId) && p.getEndAt() != null;
                if (anotherOpenExists) {
                    throw new ConflictException("There is already an open pause for this clock");
                }
            } else {
                if (!newStart.isBefore(newEnd)) {
                    throw new ConflictException("Invalid pause window (startAt must be before endAt)");
                }
            }

            // 4) Validate pause stays inside clock session window
            LocalDateTime sessionStart = c.getClockIn();
            LocalDateTime sessionEnd = (c.getClockOut() != null) ? c.getClockOut() : LocalDateTime.now();

            // For open pause, validate start only (and ensure start is not after sessionEnd)
            if (newEnd == null) {
                if (newStart.isBefore(sessionStart) || newStart.isAfter(sessionEnd)) {
                    throw new ConflictException("Pause must be inside the clock session window");
                }
            } else {
                if (newStart.isBefore(sessionStart) || newEnd.isAfter(sessionEnd)) {
                    throw new ConflictException("Pause must be inside the clock session window");
                }

                // 5) Overlap check (exclude current pause)
                boolean overlap = pauses.existsOverlapExcludingId(clockId, pauseId, newStart, newEnd);
                if (overlap) {
                    throw new ConflictException("Pause overlaps an existing pause");
                }
            }

            // 6) Apply time updates
            p.setStartAt(newStart);
            p.setEndAt(newEnd);
        }

        // 7) Note update (independent of time updates)
        if (note != null) {
            p.setNote(note.isBlank() ? null : note.trim());
        }

        return pauses.save(p);
    }

    public void delete(Long clockId, Long pauseId) {
        if (!pauses.existsByIdAndClockId(pauseId, clockId)) {
            throw new NotFoundException("Pause " + pauseId + " not found for clock " + clockId);
        }
        pauses.deleteById(pauseId);
    }

    @Transactional
    public List<ClockPause> listForClock(Long clockId) {
        return pauses.findByClockIdOrderByStartAtAsc(clockId);
    }
}