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

    @Query("""
           select c
           from Clock c
             join fetch c.user u
           where c.clockIn >= :from and c.clockIn < :to
           """)
    List<Clock> findAllBetweenFetchUser(@Param("from") LocalDateTime from,
                                        @Param("to") LocalDateTime to);

    // Used by /reports/users/{id}/hours — NO ORDER BY here (entity has @OrderBy)
    @Query("""
           select distinct c
           from Clock c
             join fetch c.user u
             left join fetch c.pauses p
           where u.id = :userId
             and c.clockIn between :from and :to
           """)
    List<Clock> findAllForUserBetweenWithPauses(@Param("userId") long userId,
                                                @Param("from") LocalDateTime from,
                                                @Param("to") LocalDateTime to);

    // Weekly overview (overlap-aware): any clock intersecting [from, to) — also no ORDER BY
    @Query("""
           select distinct c
           from Clock c
             join fetch c.user u
             left join fetch c.pauses p
           where c.clockIn < :to
             and (c.clockOut is null or c.clockOut > :from)
           """)
    List<Clock> findAllBetweenFetchUserWithPauses(@Param("from") LocalDateTime from,
                                                  @Param("to") LocalDateTime to);
}