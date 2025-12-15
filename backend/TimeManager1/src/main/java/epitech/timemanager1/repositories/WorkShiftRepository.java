package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.WorkShift;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WorkShiftRepository extends JpaRepository<WorkShift, Long> {

    List<WorkShift> findByEmployeeIdAndStartAtBetweenOrderByStartAtAsc(Long employeeId,
                                                                       LocalDateTime from,
                                                                       LocalDateTime to);

    List<WorkShift> findByTeamIdAndStartAtBetweenOrderByStartAtAsc(Long teamId,
                                                                   LocalDateTime from,
                                                                   LocalDateTime to);

    @Query("""
           select case when count(s) > 0 then true else false end
           from WorkShift s
           where s.employee.id = :employeeId
             and s.startAt < :endAt
             and s.endAt   > :startAt
           """)
    boolean existsOverlapForEmployee(@Param("employeeId") Long employeeId,
                                     @Param("startAt") LocalDateTime startAt,
                                     @Param("endAt") LocalDateTime endAt);

    @Query("""
       select case when count(s) > 0 then true else false end
       from WorkShift s
       where s.employee.id = :employeeId
         and s.id <> :excludeId
         and s.startAt < :endAt
         and s.endAt   > :startAt
       """)
    boolean existsOverlapForEmployeeExcludingId(@Param("employeeId") Long employeeId,
                                                @Param("excludeId") Long excludeId,
                                                @Param("startAt") LocalDateTime startAt,
                                                @Param("endAt") LocalDateTime endAt);
}