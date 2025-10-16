package epitech.timemanager1.services;

import epitech.timemanager1.entities.*;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.repositories.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimeSheetServiceTest {

    @Mock WorkShiftRepository workShifts;
    @Mock ClockRepository clocks;
    @Mock LeaveRequestRepository leaves;
    @Mock ScheduleOverrideRepository overrides;
    @Mock UserRepository users;
    @Mock TeamRepository teams;

    @InjectMocks TimeSheetService svc;

    @Test
    void timesheetForEmployee_combinesPlanActualLeave() {
        Long empId = 10L;
        User u = User.builder()
                .id(empId)
                .firstName("A")
                .lastName("B")
                .email("a@b.c")
                .password("x")
                .role(Role.EMPLOYEE)
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();

        LocalDate day = LocalDate.of(2025,1,7);
        LocalDateTime dayStart = day.atStartOfDay();
        LocalDateTime dayEnd   = day.plusDays(1).atStartOfDay();

        WorkShift shift = WorkShift.builder()
                .id(1L).employee(u).team(Team.builder().id(1L).name("T").build())
                .startAt(day.atTime(9,0))
                .endAt(day.atTime(17,0))
                .note("plan")
                .build();

        Clock c = Clock.builder()
                .id(1L).user(u)
                .clockIn(day.atTime(9,10))
                .clockOut(day.atTime(16,50))
                .build();

        when(users.findById(empId)).thenReturn(Optional.of(u));
        when(workShifts.findByEmployeeIdAndStartAtBetweenOrderByStartAtAsc(eq(empId), any(), any()))
                .thenReturn(List.of(shift));
        when(clocks.findByUserIdAndClockInBetween(eq(empId), any(), any()))
                .thenReturn(List.of(c));
        when(leaves.findForEmployeeInWindow(eq(empId), any(), any()))
                .thenReturn(List.of()); // no leave
        when(overrides.findByEmployeeIdAndDateBetweenOrderByDateAsc(eq(empId), any(), any()))
                .thenReturn(List.of()); // no overrides

        var ts = svc.timesheetForEmployee(empId, day, day, ZoneId.of("UTC"));
        assertEquals(empId, ts.employeeId());
        assertEquals(1, ts.days().size());
        var d = ts.days().get(0);
        assertEquals(1, d.planned().size());
        assertEquals(7.67, d.actualHours(), 0.01);
        assertNull(d.leave());
        assertNull(d.overrides());
    }
}