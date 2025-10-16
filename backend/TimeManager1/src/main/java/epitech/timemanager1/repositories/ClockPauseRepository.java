package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.ClockPause;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

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
}