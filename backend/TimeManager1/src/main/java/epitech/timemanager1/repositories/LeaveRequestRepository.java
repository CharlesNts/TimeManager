package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.LeaveRequest;
import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.entities.User;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByEmployeeOrderByCreatedAtDesc(User employee);

    List<LeaveRequest> findByEmployeeAndStatusInOrderByStartAtAsc(User employee, List<LeaveStatus> statuses);

    @Query("""
           select case when count(l) > 0 then true else false end
           from LeaveRequest l
           where l.employee.id = :employeeId
             and l.status in (epitech.timemanager1.entities.LeaveStatus.APPROVED,
                              epitech.timemanager1.entities.LeaveStatus.PENDING)
             and l.startAt < :endAt
             and l.endAt   > :startAt
           """)
    boolean existsOverlappingApprovedOrPending(@Param("employeeId") Long employeeId,
                                               @Param("startAt") LocalDateTime startAt,
                                               @Param("endAt") LocalDateTime endAt);

    @Query("""
       select l
       from LeaveRequest l
       join l.employee e
       where l.status = epitech.timemanager1.entities.LeaveStatus.PENDING
         and exists (
            select 1
            from Team t
            join t.members m
            where t.manager.id = :managerId
              and m.id = e.id
         )
       order by l.createdAt desc
       """)
    List<LeaveRequest> findPendingForManager(@Param("managerId") Long managerId);

    // Simple month view
    @Query("""
           select l
           from LeaveRequest l
           where l.employee.id = :employeeId
             and l.startAt < :monthEnd
             and l.endAt   > :monthStart
           order by l.startAt asc
           """)
    List<LeaveRequest> findForEmployeeInWindow(@Param("employeeId") Long employeeId,
                                               @Param("monthStart") LocalDateTime monthStart,
                                               @Param("monthEnd") LocalDateTime monthEnd);
}