package epitech.timemanager1.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamMemberDTO {
    private UserDTO user;
    private TeamDTO team;
    private LocalDateTime joinedAt;
}