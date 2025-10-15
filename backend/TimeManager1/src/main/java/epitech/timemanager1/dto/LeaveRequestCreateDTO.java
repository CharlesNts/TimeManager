// src/main/java/epitech/timemanager1/dto/LeaveRequestCreateDTO.java
package epitech.timemanager1.dto;

import epitech.timemanager1.entities.LeaveType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LeaveRequestCreateDTO {
    @NotNull private LeaveType type;
    @NotNull private LocalDateTime startAt;
    @NotNull private LocalDateTime endAt;
    @Size(max = 500) private String reason;
}