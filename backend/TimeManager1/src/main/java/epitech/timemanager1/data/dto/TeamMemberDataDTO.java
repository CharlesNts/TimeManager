package epitech.timemanager1.data.dto;

import java.time.LocalDateTime;

public record TeamMemberDataDTO(
        Long userId,
        Long teamId,
        LocalDateTime joinedAt
) {}