package epitech.timemanager1.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data @Builder
public class ScheduleOverrideDTO {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private LocalDate date;
    private String field;
    private String value;
    private String reason;
}