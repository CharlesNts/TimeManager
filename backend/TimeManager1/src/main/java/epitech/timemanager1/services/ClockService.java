package epitech.timemanager1.services;

import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.ClockRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service layer handling clock-in and clock-out operations for users.
 * <p>
 * Provides methods for managing work sessions, including:
 * <ul>
 *   <li>Clocking in and clocking out users</li>
 *   <li>Listing user sessions by period</li>
 *   <li>Validating session states to prevent conflicts</li>
 * </ul>
 * </p>
 */
@Service
@Transactional
public class ClockService {

    private final ClockRepository clocks;
    private final UserRepository users;

    /**
     * Constructs a new {@link ClockService} with the given repositories.
     *
     * @param clocks the clock repository for managing time records
     * @param users  the user repository for user lookups
     */
    public ClockService(ClockRepository clocks, UserRepository users) {
        this.clocks = clocks;
        this.users = users;
    }

    /**
     * Clocks in a user by creating a new {@link Clock} record.
     * <p>
     * A user cannot clock in twice without first clocking out.
     * </p>
     *
     * @param userId the ID of the user clocking in
     * @param when   optional timestamp (uses current time if null)
     * @return the created {@link Clock} entity
     * @throws NotFoundException   if the user does not exist
     * @throws ConflictException   if the user is already clocked in
     */
    public Clock clockIn(long userId, LocalDateTime when) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        Optional<Clock> last = clocks.findTopByUserOrderByClockInDesc(user);
        if (last.isPresent() && last.get().getClockOut() == null) {
            throw new ConflictException("User is already clocked-in");
        }

        Clock c = Clock.builder()
                .user(user)
                .clockIn(when != null ? when : LocalDateTime.now())
                .build();

        return clocks.save(c);
    }

    /**
     * Clocks out a user by updating their latest active {@link Clock} record.
     * <p>
     * Throws an exception if the user has no active session or is already clocked out.
     * </p>
     *
     * @param userId the ID of the user clocking out
     * @param when   optional timestamp (uses current time if null)
     * @return the updated {@link Clock} entity
     * @throws NotFoundException if the user does not exist
     * @throws ConflictException if there is no active clock-in session or already clocked out
     */
    public Clock clockOut(long userId, LocalDateTime when) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        Clock last = clocks.findTopByUserOrderByClockInDesc(user)
                .orElseThrow(() -> new ConflictException("No active session to clock-out"));

        if (last.getClockOut() != null) {
            throw new ConflictException("Already clocked-out");
        }

        last.setClockOut(when != null ? when : LocalDateTime.now());
        return last; // Managed entity; automatically persisted
    }

    /**
     * Retrieves a paginated list of clock records for a user.
     *
     * @param userId   the ID of the user
     * @param pageable pagination and sorting information
     * @return a {@link Page} of {@link Clock} records
     * @throws NotFoundException if the user does not exist
     */
    @Transactional(readOnly = true)
    public Page<Clock> listForUser(long userId, Pageable pageable) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        return clocks.findByUser(user, pageable);
    }

    /**
     * Retrieves all clock records for a user within a given date range.
     *
     * @param userId the ID of the user
     * @param from   start of the time range (inclusive)
     * @param to     end of the time range (exclusive)
     * @return a list of {@link Clock} records within the specified range
     */
    @Transactional(readOnly = true)
    public java.util.List<Clock> listForUserBetween(long userId, LocalDateTime from, LocalDateTime to) {
        return clocks.findByUserIdAndClockInBetween(userId, from, to);
    }
}