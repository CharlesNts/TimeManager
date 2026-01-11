package epitech.timemanager1.data.dto;

import java.time.LocalDateTime;

public record ClockPauseDataDTO(
        Long id,
        Long clockId,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String note
) {}