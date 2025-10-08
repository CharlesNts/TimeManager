package epitech.timemanager1.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamDTO {

    private Long id;

    private String name;

    private String description;

    // The manager represented as a nested UserDTO
    private UserDTO manager;

    private LocalDateTime createdAt;
}