package epitech.timemanager1.services;

import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.entities.WorkShift;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import epitech.timemanager1.repositories.WorkShiftRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
@RequiredArgsConstructor
public class WorkShiftService {

    private final WorkShiftRepository workShifts;
    private final TeamRepository teams;
    private final UserRepository users;

    /** Create a work shift (optionally assigned to an employee). */
    public WorkShift create(Long teamId,
                            Long employeeId,         // may be null (unassigned slot)
                            LocalDateTime startAt,
                            LocalDateTime endAt,
                            String location,
                            String note) {

        if (startAt == null || endAt == null || !startAt.isBefore(endAt)) {
            throw new ConflictException("Invalid time window");
        }

        Team team = teams.findById(teamId)
                .orElseThrow(() -> new NotFoundException("Team not found: " + teamId));

        User employee = null;
        if (employeeId != null) {
            employee = users.findById(employeeId)
                    .orElseThrow(() -> new NotFoundException("User not found: " + employeeId));
            ensureNoEmployeeOverlap(employee.getId(), startAt, endAt, null);
        }

        WorkShift ws = WorkShift.builder()
                .team(team)
                .employee(employee)
                .startAt(startAt)
                .endAt(endAt)
                .note(note)
                .build();

        if (location != null && !location.isBlank()) {
            // WorkShift has a `note` field only — add a `location` column if needed.
            // If you later add `location` to WorkShift entity, set it here instead.
            ws.setNote(concatNoteWithLocation(note, location));
        }

        return workShifts.save(ws);
    }

    /** Update a work shift’s core fields. */
    public WorkShift update(Long shiftId,
                            Long newEmployeeId,      // may be null to unassign
                            LocalDateTime startAt,
                            LocalDateTime endAt,
                            String location,
                            String note) {
        WorkShift ws = workShifts.findById(shiftId)
                .orElseThrow(() -> new NotFoundException("Shift not found: " + shiftId));

        if (startAt != null && endAt != null && !startAt.isBefore(endAt)) {
            throw new ConflictException("Invalid time window");
        }

        // Re-assign employee if changed
        if (!Objects.equals(idOf(ws.getEmployee()), newEmployeeId)) {
            User employee = null;
            if (newEmployeeId != null) {
                employee = users.findById(newEmployeeId)
                        .orElseThrow(() -> new NotFoundException("User not found: " + newEmployeeId));
            }
            ws.setEmployee(employee);
        }

        // Update times with overlap validation
        LocalDateTime newStart = startAt != null ? startAt : ws.getStartAt();
        LocalDateTime newEnd   = endAt   != null ? endAt   : ws.getEndAt();

        if (!newStart.isBefore(newEnd)) {
            throw new ConflictException("Invalid time window");
        }

        if (ws.getEmployee() != null) {
            ensureNoEmployeeOverlap(ws.getEmployee().getId(), newStart, newEnd, ws.getId());
        }

        ws.setStartAt(newStart);
        ws.setEndAt(newEnd);

        if (note != null) {
            ws.setNote(note);
        }
        if (location != null && !location.isBlank()) {
            ws.setNote(concatNoteWithLocation(ws.getNote(), location));
        }

        return ws;
    }

    /** Assign or change the employee on a shift. */
    public WorkShift assignEmployee(Long shiftId, Long employeeId) {
        WorkShift ws = workShifts.findById(shiftId)
                .orElseThrow(() -> new NotFoundException("Shift not found: " + shiftId));

        User employee = users.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("User not found: " + employeeId));

        ensureNoEmployeeOverlap(employee.getId(), ws.getStartAt(), ws.getEndAt(), ws.getId());
        ws.setEmployee(employee);
        return ws;
    }

    /** Unassign employee (keep the shift slot). */
    public WorkShift unassignEmployee(Long shiftId) {
        WorkShift ws = workShifts.findById(shiftId)
                .orElseThrow(() -> new NotFoundException("Shift not found: " + shiftId));
        ws.setEmployee(null);
        return ws;
    }

    /** Delete a shift. */
    public void delete(Long shiftId) {
        if (!workShifts.existsById(shiftId)) {
            throw new NotFoundException("Shift not found: " + shiftId);
        }
        workShifts.deleteById(shiftId);
    }

    /** List shifts for a team in a window (manager view). */
    @Transactional
    public List<WorkShift> listTeamShifts(Long teamId, LocalDateTime from, LocalDateTime to) {
        return workShifts.findByTeamIdAndStartAtBetweenOrderByStartAtAsc(teamId, from, to);
    }

    /** List shifts for an employee in a window (employee view). */
    @Transactional
    public List<WorkShift> listEmployeeShifts(Long employeeId, LocalDateTime from, LocalDateTime to) {
        return workShifts.findByEmployeeIdAndStartAtBetweenOrderByStartAtAsc(employeeId, from, to);
    }

    // ---- helpers ----

    private void ensureNoEmployeeOverlap(Long employeeId,
                                         LocalDateTime startAt,
                                         LocalDateTime endAt,
                                         Long excludeShiftId) {
        boolean overlaps;
        if (excludeShiftId == null) {
            overlaps = workShifts.existsOverlapForEmployee(employeeId, startAt, endAt);
        } else {
            // If you add the "exclude id" version in the repo, call it here.
            overlaps = workShifts.existsOverlapForEmployee(employeeId, startAt, endAt);
        }
        if (overlaps) {
            throw new ConflictException("Employee already has overlapping shift");
        }
    }

    private Long idOf(User u) {
        return u == null ? null : u.getId();
    }

    private String concatNoteWithLocation(String baseNote, String location) {
        String loc = "[location: " + location + "]";
        if (baseNote == null || baseNote.isBlank()) return loc;
        return loc + " " + baseNote;
    }
}