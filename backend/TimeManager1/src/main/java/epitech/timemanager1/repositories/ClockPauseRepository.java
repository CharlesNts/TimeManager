package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.ClockPause;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ClockPauseRepository extends JpaRepository<ClockPause, Long> {

    List<ClockPause> findByClockIdOrderByStartAtAsc(Long clockId);

    @Query("""
           select case when count(p)>0 then true else false end
           from ClockPause p
           where p.clock.id = :clockId
             and p.startAt < :endAt
             and p.endAt   > :startAt
           """)
    boolean existsOverlap(Long clockId, LocalDateTime startAt, LocalDateTime endAt);

    @Query("""
        select case when count(p) > 0 then true else false end
        from ClockPause p
        where p.clock.id = :clockId
          and p.id <> :pauseId
          and p.startAt < :endAt
          and p.endAt   > :startAt
    """)
    boolean existsOverlapExcludingId(Long clockId,
                                     Long pauseId,
                                     LocalDateTime startAt,
                                     LocalDateTime endAt);


    boolean existsByClockIdAndEndAtIsNull(Long clockId);
    boolean existsByIdAndClockId(Long id, Long clockId);
    Optional<ClockPause> findByIdAndClockId(Long id, Long clockId);
}