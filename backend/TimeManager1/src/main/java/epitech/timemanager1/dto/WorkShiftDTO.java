package epitech.timemanager1.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class WorkShiftDTO {
    private Long id;
    private Long employeeId; // nullable
    private String employeeName; // nullable
    private Long teamId; // nullable
    private String teamName; // nullable
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String note;
}