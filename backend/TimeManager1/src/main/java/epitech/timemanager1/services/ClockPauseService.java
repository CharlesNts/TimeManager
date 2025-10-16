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

        if (startAt == null || endAt == null || !startAt.isBefore(endAt)) {
            throw new ConflictException("Invalid pause window");
        }
        // must be inside the clock interval
        LocalDateTime in  = c.getClockIn();
        LocalDateTime out = c.getClockOut();
        if (out == null || startAt.isBefore(in) || endAt.isAfter(out)) {
            throw new ConflictException("Pause must be inside the clock-in/out interval");
        }
        if (pauses.existsOverlap(clockId, startAt, endAt)) {
            throw new ConflictException("Pause overlaps an existing pause");
        }

        ClockPause p = ClockPause.builder()
                .clock(c)
                .startAt(startAt)
                .endAt(endAt)
                .note(note)
                .build();

        return pauses.save(p);
    }

    public ClockPause update(Long pauseId,
                             LocalDateTime startAt,
                             LocalDateTime endAt,
                             String note) {
        ClockPause p = pauses.findById(pauseId)
                .orElseThrow(() -> new NotFoundException("Pause not found: " + pauseId));

        LocalDateTime newStart = startAt != null ? startAt : p.getStartAt();
        LocalDateTime newEnd   = endAt   != null ? endAt   : p.getEndAt();
        if (!newStart.isBefore(newEnd)) {
            throw new ConflictException("Invalid pause window");
        }

        Clock c = p.getClock();
        if (c.getClockOut() == null || newStart.isBefore(c.getClockIn()) || newEnd.isAfter(c.getClockOut())) {
            throw new ConflictException("Pause must be inside the clock-in/out interval");
        }

        // check overlap excluding self
        boolean overlap = pauses.existsOverlap(c.getId(), newStart, newEnd);
        if (overlap && !(newStart.equals(p.getStartAt()) && newEnd.equals(p.getEndAt()))) {
            // crude but effective; if you want exact exclude-self, add a repo method with id<>:pauseId
            throw new ConflictException("Pause overlaps an existing pause");
        }

        p.setStartAt(newStart);
        p.setEndAt(newEnd);
        if (note != null) p.setNote(note.isBlank() ? null : note);
        return p;
    }

    public void delete(Long pauseId) {
        if (!pauses.existsById(pauseId)) {
            throw new NotFoundException("Pause not found: " + pauseId);
        }
        pauses.deleteById(pauseId);
    }

    @Transactional
    public List<ClockPause> listForClock(Long clockId) {
        return pauses.findByClockIdOrderByStartAtAsc(clockId);
    }
}