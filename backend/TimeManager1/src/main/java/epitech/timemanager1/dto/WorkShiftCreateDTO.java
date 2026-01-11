package epitech.timemanager1.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class WorkShiftCreateDTO {
    private Long employeeId;
    private Long teamId;

    @NotNull private LocalDateTime startAt;
    @NotNull private LocalDateTime endAt;

    @Size(max = 300)
    private String note;
}