package epitech.timemanager1.services;

import epitech.timemanager1.entities.ScheduleOverride;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.ScheduleOverrideRepository;
import epitech.timemanager1.repositories.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Manages ad-hoc schedule overrides (e.g., special hours, location changes…)
 * for a specific employee on a given date.
 *
 * Notes:
 * - Entity constraints (@NotNull, @Size) are mirrored with simple pre-checks here.
 * - We avoid Lombok @Builder to prevent “missing non-nullable fields” warnings.
 * - JPA will flush updated managed entities automatically within the transaction.
 */
@Service
@Transactional
@RequiredArgsConstructor
public class ScheduleOverrideService {

    private final ScheduleOverrideRepository overrides;
    private final UserRepository users;

    /**
     * Create a new override for an employee and date.
     */
    public ScheduleOverride create(Long employeeId,
                                   LocalDate date,
                                   String field,
                                   String value,
                                   String reason) {

        // Validate required inputs (mirror of @NotNull on entity)
        if (employeeId == null) throw new IllegalArgumentException("employeeId must not be null");
        if (date == null)       throw new IllegalArgumentException("date must not be null");
        if (field == null || field.isBlank()) throw new IllegalArgumentException("field must not be blank");
        if (value == null || value.isBlank()) throw new IllegalArgumentException("value must not be blank");

        // Ensure employee exists
        User employee = users.findById(employeeId)
                .orElseThrow(() -> new NotFoundException("User not found: " + employeeId));

        // Construct explicitly (no builder) to satisfy non-nullable fields
        ScheduleOverride ov = new ScheduleOverride();
        ov.setEmployee(employee);
        ov.setDate(date);
        ov.setField(field.trim());
        ov.setValue(value.trim());
        ov.setReason((reason != null && !reason.isBlank()) ? reason.trim() : null);

        return overrides.save(ov);
    }

    /**
     * Update an existing override (any non-null argument is applied).
     */
    public ScheduleOverride update(Long overrideId,
                                   String field,
                                   String value,
                                   String reason,
                                   LocalDate date) {

        ScheduleOverride ov = overrides.findById(overrideId)
                .orElseThrow(() -> new NotFoundException("Override not found: " + overrideId));

        if (date != null) {
            ov.setDate(date);
        }
        if (field != null) {
            if (field.isBlank()) throw new IllegalArgumentException("field must not be blank");
            ov.setField(field.trim());
        }
        if (value != null) {
            if (value.isBlank()) throw new IllegalArgumentException("value must not be blank");
            ov.setValue(value.trim());
        }
        if (reason != null) {
            ov.setReason(reason.isBlank() ? null : reason.trim());
        }

        // Managed entity; no explicit save required, but OK to be explicit:
        return overrides.save(ov);
    }

    /**
     * List overrides for an employee within a date window (inclusive), ordered by date ASC.
     */
    @Transactional(Transactional.TxType.SUPPORTS)
    public List<ScheduleOverride> listForEmployee(Long employeeId,
                                                  LocalDate from,
                                                  LocalDate to) {

        if (employeeId == null) throw new IllegalArgumentException("employeeId must not be null");
        if (from == null || to == null) throw new IllegalArgumentException("from/to must not be null");
        if (from.isAfter(to)) throw new IllegalArgumentException("from must be <= to");

        // Optional existence check — uncomment if you want strict validation:
        // users.findById(employeeId).orElseThrow(() -> new NotFoundException("User not found: " + employeeId));

        return overrides.findByEmployeeIdAndDateBetweenOrderByDateAsc(employeeId, from, to);
    }

    /**
     * Delete an override by id (idempotent: no-op if not found).
     */
    public void delete(Long overrideId) {
        if (overrideId == null) throw new IllegalArgumentException("overrideId must not be null");
        overrides.deleteById(overrideId);
    }
}