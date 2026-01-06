package epitech.timemanager1.data.dto;

import java.time.LocalDateTime;

public record ClockDataDTO(
        Long id,
        Long userId,
        LocalDateTime clockIn,
        LocalDateTime clockOut
) {}