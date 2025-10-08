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

@Service
@Transactional
public class ClockService {

    private final ClockRepository clocks;
    private final UserRepository users;

    public ClockService(ClockRepository clocks, UserRepository users) {
        this.clocks = clocks;
        this.users = users;
    }

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

    public Clock clockOut(long userId, LocalDateTime when) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        Clock last = clocks.findTopByUserOrderByClockInDesc(user)
                .orElseThrow(() -> new ConflictException("No active session to clock-out"));

        if (last.getClockOut() != null) {
            throw new ConflictException("Already clocked-out");
        }

        last.setClockOut(when != null ? when : LocalDateTime.now());
        return last; // managed entity; will flush
    }

    @Transactional(readOnly = true)
    public Page<Clock> listForUser(long userId, Pageable pageable) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
        return clocks.findByUser(user, pageable);
    }

    @Transactional(readOnly = true)
    public java.util.List<Clock> listForUserBetween(long userId, LocalDateTime from, LocalDateTime to) {
        return clocks.findByUserIdAndClockInBetween(userId, from, to);
    }
}