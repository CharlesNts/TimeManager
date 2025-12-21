package epitech.timemanager1.events;

import java.time.LocalDateTime;

public record PasswordResetRequestedEvent(
        Long userId,
        String email,
        String link, LocalDateTime requestedAt
) {}