package epitech.timemanager1.events;

import java.time.LocalDateTime;

public record UserRejectedEvent(
        Long userId,
        String email,
        String firstName,
        String reason,
        LocalDateTime rejectedAt
) {}