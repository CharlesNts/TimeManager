package epitech.timemanager1.data.service;

import epitech.timemanager1.data.dto.ClockPauseDataDTO;
import epitech.timemanager1.entities.ClockPause;
import epitech.timemanager1.repositories.ClockPauseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClockPauseDataService {

    private final ClockPauseRepository clockPauseRepository;

    public List<ClockPauseDataDTO> findAll() {
        return clockPauseRepository.findAll()
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    private ClockPauseDataDTO toDataDTO(ClockPause pause) {
        return new ClockPauseDataDTO(
                pause.getId(),
                pause.getClock().getId(),
                pause.getStartAt(),
                pause.getEndAt(),
                pause.getNote()
        );
    }
}