package epitech.timemanager1.events;

import java.time.LocalDateTime;

public record UserRegisteredEvent(
        Long userId,
        String email,
        String firstName,
        LocalDateTime registeredAt
) {}