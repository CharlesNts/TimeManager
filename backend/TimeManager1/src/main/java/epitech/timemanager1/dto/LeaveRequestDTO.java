package epitech.timemanager1.dto;

import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.entities.LeaveType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class LeaveRequestDTO {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private Long approverId;     // nullable
    private String approverName; // nullable
    private LeaveType type;
    private LeaveStatus status;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String reason;
    private LocalDateTime createdAt;
}