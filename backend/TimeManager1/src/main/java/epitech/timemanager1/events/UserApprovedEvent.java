package epitech.timemanager1.events;

import java.time.LocalDateTime;

public record UserApprovedEvent(
        Long userId,
        String email,
        String firstName,
        LocalDateTime approvedAt
) {}