package epitech.timemanager1.data.service;

import epitech.timemanager1.data.dto.ClockDataDTO;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.repositories.ClockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClockDataService {

    private final ClockRepository clockRepository;

    /**
     * Full snapshot of all clock events.
     * Used for initial loads or full refreshes.
     */
    public List<ClockDataDTO> findAll() {
        return clockRepository.findAll()
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    /**
     * Incremental extraction based on event time (clockIn).
     */
    public List<ClockDataDTO> findBetween(LocalDateTime from, LocalDateTime to) {
        return clockRepository.findAllBetween(from, to)
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    private ClockDataDTO toDataDTO(Clock clock) {
        return new ClockDataDTO(
                clock.getId(),
                clock.getUser().getId(),
                clock.getClockIn(),
                clock.getClockOut()
        );
    }
}