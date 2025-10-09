package epitech.timemanager1.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClockDTO {
    private Long id;
    private UserDTO user;
    private LocalDateTime clockIn;
    private LocalDateTime clockOut;
}