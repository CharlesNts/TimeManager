package epitech.timemanager1.data.dto;

import java.time.LocalDateTime;

public record TeamDataDTO(
        Long id,
        String name,
        String description,
        Long managerId,
        LocalDateTime createdAt
) {}