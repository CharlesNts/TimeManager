package epitech.timemanager1.dto;

import epitech.timemanager1.entities.LeaveStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LeaveDecisionDTO {
    @NotNull private LeaveStatus decision; // APPROVED or REJECTED
    @Size(max = 300) private String note;  // optional approver note
}