package epitech.timemanager1.data.dto;

import java.time.LocalDateTime;

public record UserDataDTO(
        Long id,
        String email,
        String firstName,
        String lastName,
        String role,
        boolean active,
        LocalDateTime createdAt
) {}