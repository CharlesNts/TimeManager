package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.LeaveRequest;
import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.entities.User;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

  // List employee leaves newest first (uses createdAt)
  List<LeaveRequest> findByEmployeeOrderByCreatedAtDesc(User employee);

  // Filter by status set and order by startDate ASC
  List<LeaveRequest> findByEmployeeAndStatusInOrderByStartDateAsc(
      User employee, List<LeaveStatus> statuses);

  // Overlap check for APPROVED or PENDING requests:
  // overlap rule: existing.startDate < newEnd && existing.endDate > newStart
  @Query("""
      select case when count(l) > 0 then true else false end
      from LeaveRequest l
      where l.employee.id = :employeeId
        and l.status in (epitech.timemanager1.entities.LeaveStatus.APPROVED,
                         epitech.timemanager1.entities.LeaveStatus.PENDING)
        and l.startDate < :endDate
        and l.endDate   > :startDate
      """)
  boolean existsOverlappingApprovedOrPending(@Param("employeeId") Long employeeId,
      @Param("startDate") LocalDate startDate,
      @Param("endDate") LocalDate endDate);

  // All PENDING leaves visible to a manager (via team membership)
  @Query("""
    select l
    from LeaveRequest l
    join l.employee e
    where l.status = epitech.timemanager1.entities.LeaveStatus.PENDING
      and exists (
        select 1
        from TeamMember tm
        join tm.team t
        where t.manager.id = :managerId
          and tm.user.id = e.id
      )
    order by l.createdAt desc
    """)
  List<LeaveRequest> findPendingForManager(@Param("managerId") Long managerId);

  // Window view for a month (or any window): overlap with [monthStart, monthEnd)
  @Query("""
      select l
      from LeaveRequest l
      where l.employee.id = :employeeId
        and l.startDate < :monthEnd
        and l.endDate   > :monthStart
      order by l.startDate asc
      """)
  List<LeaveRequest> findForEmployeeInWindow(@Param("employeeId") Long employeeId,
      @Param("monthStart") LocalDate monthStart,
      @Param("monthEnd") LocalDate monthEnd);

  // Simple helpers used by your service
  List<LeaveRequest> findByEmployeeIdOrderByStartDateDesc(Long employeeId);

  List<LeaveRequest> findByStatusOrderByStartDateAsc(LeaveStatus status);

  List<LeaveRequest> findByEmployeeIdOrderByStartDateAsc(Long employeeId);
}