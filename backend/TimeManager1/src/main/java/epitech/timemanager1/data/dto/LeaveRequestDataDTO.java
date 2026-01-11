package epitech.timemanager1.data.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record LeaveRequestDataDTO(
        Long id,
        Long employeeId,
        String type,
        String status,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime createdAt,
        String reason
) {}