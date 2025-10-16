package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.LeaveDecisionDTO;
import epitech.timemanager1.dto.LeaveRequestCreateDTO;
import epitech.timemanager1.entities.LeaveRequest;
import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.services.LeaveRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
public class LeavesController {

    private final LeaveRequestService leaves;

    /** Employee creates a leave request. */
    @PostMapping
    public ResponseEntity<LeaveRequest> requestLeave(
            @RequestParam Long employeeId,
            @Valid @RequestBody LeaveRequestCreateDTO body,
            @RequestParam(defaultValue = "UTC") String zone // if frontend sends local datetimes
    ) {
        var z = ZoneId.of(zone);
        var start = body.getStartAt().atZone(ZoneId.systemDefault()).withZoneSameInstant(z).toLocalDate();
        var end   = body.getEndAt().atZone(ZoneId.systemDefault()).withZoneSameInstant(z).toLocalDate();

        var created = leaves.requestLeave(
                employeeId,
                body.getType(),
                start,
                end,
                body.getReason()
        );
        return ResponseEntity.ok(created);
    }

    /** Employee cancels their own pending leave. */
    @PostMapping("/{leaveId}/cancel")
    public ResponseEntity<LeaveRequest> cancel(
            @PathVariable Long leaveId,
            @RequestParam Long employeeId
    ) {
        return ResponseEntity.ok(leaves.cancelPending(employeeId, leaveId));
    }

    /** Manager/CEO decides: approve or reject (with optional note). */
    @PostMapping("/{leaveId}/decision")
    public ResponseEntity<LeaveRequest> decide(
            @PathVariable Long leaveId,
            @Valid @RequestBody LeaveDecisionDTO body
    ) {
        if (body.getDecision() == LeaveStatus.APPROVED) {
            return ResponseEntity.ok(leaves.approve(leaveId));
        }
        if (body.getDecision() == LeaveStatus.REJECTED) {
            return ResponseEntity.ok(leaves.reject(leaveId, body.getNote()));
        }
        return ResponseEntity.badRequest().build();
    }

    /** All requests for an employee (newest first). */
    @GetMapping
    public ResponseEntity<List<LeaveRequest>> listForEmployee(@RequestParam Long employeeId) {
        return ResponseEntity.ok(leaves.listForEmployee(employeeId));
    }

    /** All pending requests visible to approvers (scope with security if needed). */
    @GetMapping("/pending")
    public ResponseEntity<List<LeaveRequest>> listPending() {
        return ResponseEntity.ok(leaves.listPendingForApprover());
    }
}