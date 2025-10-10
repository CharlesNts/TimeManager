package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ClockRepository extends JpaRepository<Clock, Long> {

    Optional<Clock> findTopByUserOrderByClockInDesc(User user);

    Page<Clock> findByUser(User user, Pageable pageable);

    List<Clock> findByUserAndClockInBetween(User user, LocalDateTime from, LocalDateTime to);


    List<Clock> findByUserIdAndClockInBetween(Long userId, LocalDateTime from, LocalDateTime to);

    @Query(
            "select c " +
                    "from Clock c " +
                    "join fetch c.user u " +
                    "where c.clockIn >= :from and c.clockIn < :to"
    )
    List<Clock> findAllBetweenFetchUser(@Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to);
}