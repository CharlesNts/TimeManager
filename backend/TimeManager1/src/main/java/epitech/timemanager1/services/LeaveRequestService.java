package epitech.timemanager1.services;

import epitech.timemanager1.entities.LeaveRequest;
import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.entities.LeaveType;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.LeaveRequestRepository;
import epitech.timemanager1.repositories.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class LeaveRequestService {

    private final LeaveRequestRepository leaves;
    private final UserRepository users;

    /** Employee submits a PENDING leave request. */
    public LeaveRequest requestLeave(Long employeeId,
            LeaveType type,
            LocalDate startDate,
            LocalDate endDate,
            String reason) {

        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new ConflictException("Invalid date range");
        }

        User employee = users.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("User not found: " + employeeId));

        // Prevent overlap with existing APPROVED/PENDING leaves
        boolean overlaps = leaves.existsOverlappingApprovedOrPending(employeeId, startDate, endDate);
        if (overlaps) {
            throw new ConflictException("Overlaps an existing leave (APPROVED or PENDING)");
        }

        LeaveRequest lr = LeaveRequest.builder()
                .employee(employee)
                .type(type)
                .status(LeaveStatus.PENDING)
                .startDate(startDate)
                .endDate(endDate)
                .reason(reason)
                .build();

        return leaves.save(lr);
    }

    /** Employee can cancel their own PENDING leave. */
    public LeaveRequest cancelPending(Long employeeId, Long leaveId) {
        LeaveRequest lr = leaves.findById(leaveId)
                .orElseThrow(() -> new NotFoundException("Leave not found: " + leaveId));

        if (!lr.getEmployee().getId().equals(employeeId)) {
            throw new ConflictException("Cannot cancel another user's leave");
        }
        if (lr.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Only PENDING leaves can be cancelled");
        }
        lr.setStatus(LeaveStatus.CANCELLED);
        return lr;
    }

    /** Manager/CEO approves a pending leave. */
    public LeaveRequest approve(Long leaveId) {
        LeaveRequest lr = leaves.findById(leaveId)
                .orElseThrow(() -> new NotFoundException("Leave not found: " + leaveId));

        if (lr.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Only PENDING leaves can be approved");
        }

        boolean overlapsApprovedOrPending = leaves.existsOverlappingApprovedOrPending(
                lr.getEmployee().getId(), lr.getStartDate(), lr.getEndDate());

        // If overlap exists and it’s the same record, it’s fine; otherwise block.
        if (overlapsApprovedOrPending) {
            boolean conflicts = leaves.findByEmployeeIdOrderByStartDateAsc(lr.getEmployee().getId())
                    .stream()
                    .filter(other -> !other.getId().equals(lr.getId()))
                    .anyMatch(other -> other.getStatus() == LeaveStatus.APPROVED &&
                            !(lr.getEndDate().isBefore(other.getStartDate()) ||
                                    lr.getStartDate().isAfter(other.getEndDate())));
            if (conflicts) {
                throw new ConflictException("Conflicts with an already APPROVED leave");
            }
        }

        lr.setStatus(LeaveStatus.APPROVED);
        return lr;
    }

    /** Manager/CEO rejects a pending leave (optionally with a note). */
    public LeaveRequest reject(Long leaveId, String note) {
        LeaveRequest lr = leaves.findById(leaveId)
                .orElseThrow(() -> new NotFoundException("Leave not found: " + leaveId));

        if (lr.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Only PENDING leaves can be rejected");
        }
        if (note != null && !note.isBlank()) {
            lr.setReason(note);
        }
        lr.setStatus(LeaveStatus.REJECTED);
        return lr;
    }

    /** Employee history (newest first). */
    @Transactional
    public List<LeaveRequest> listForEmployee(Long employeeId) {
        users.findById(employeeId).orElseThrow(() -> new NotFoundException("User not found: " + employeeId));
        return leaves.findByEmployeeIdOrderByStartDateDesc(employeeId);
    }

    /** Pending leaves visible to approvers (manager/CEO). */
    @Transactional
    public List<LeaveRequest> listPendingForApprover() {
        return leaves.findByStatusOrderByStartDateAsc(LeaveStatus.PENDING);
    }

    /** Simple month (or any window) view for a user. */
    @Transactional
    public List<LeaveRequest> listForEmployeeInWindow(Long employeeId, LocalDate from, LocalDate to) {
        return leaves.findForEmployeeInWindow(employeeId, from, to);
    }

    /** Update a PENDING leave request. */
    public LeaveRequest update(Long leaveId,
            LeaveType type,
            LocalDate startDate,
            LocalDate endDate,
            String reason) {

        LeaveRequest lr = leaves.findById(leaveId)
                .orElseThrow(() -> new NotFoundException("Leave not found: " + leaveId));

        if (lr.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Only PENDING leaves can be updated");
        }

        LocalDate newStart = (startDate != null) ? startDate : lr.getStartDate();
        LocalDate newEnd = (endDate != null) ? endDate : lr.getEndDate();

        if (newStart == null || newEnd == null || newStart.isAfter(newEnd)) {
            throw new ConflictException("Invalid date range");
        }

        Long employeeId = lr.getEmployee().getId();

        // Same overlap rule as creation, but exclude current leave id.
        boolean overlaps = leaves.existsOverlappingApprovedOrPending(employeeId, newStart, newEnd);
        if (overlaps) {
            boolean conflicts = leaves.findByEmployeeIdOrderByStartDateAsc(employeeId)
                    .stream()
                    .filter(other -> !other.getId().equals(lr.getId()))
                    .anyMatch(other -> (other.getStatus() == LeaveStatus.APPROVED ||
                            other.getStatus() == LeaveStatus.PENDING) &&
                            !(newEnd.isBefore(other.getStartDate()) ||
                                    newStart.isAfter(other.getEndDate())));
            if (conflicts) {
                throw new ConflictException("Overlaps an existing leave (APPROVED or PENDING)");
            }
        }

        lr.setType(type != null ? type : lr.getType());
        lr.setStartDate(newStart);
        lr.setEndDate(newEnd);
        if (reason != null) {
            lr.setReason(reason);
        }
        return lr; // managed entity
    }

    /** Delete a PENDING leave request. */
    public void delete(Long leaveId) {
        LeaveRequest lr = leaves.findById(leaveId)
                .orElseThrow(() -> new NotFoundException("Leave not found: " + leaveId));

        if (lr.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Only PENDING leaves can be deleted");
        }
        leaves.delete(lr);
    }
}