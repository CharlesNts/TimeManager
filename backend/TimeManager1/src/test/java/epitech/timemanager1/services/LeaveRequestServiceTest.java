package epitech.timemanager1.services;

import epitech.timemanager1.entities.*;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.LeaveRequestRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceTest {

    @Mock LeaveRequestRepository leaves;
    @Mock UserRepository users;

    @InjectMocks LeaveRequestService svc;

    private User employee;

    @BeforeEach
    void setUp() {
        employee = User.builder()
                .id(10L).firstName("A").lastName("B")
                .email("a@b.c").password("x").role(Role.EMPLOYEE)
                .active(true).build();
    }

    @Test
    void requestLeave_ok_savesPending() {
        LocalDate start = LocalDate.of(2025, 1, 10);
        LocalDate end   = LocalDate.of(2025, 1, 12);

        when(users.findById(10L)).thenReturn(Optional.of(employee));
        when(leaves.existsOverlappingApprovedOrPending(10L, start, end)).thenReturn(false);
        when(leaves.save(any())).thenAnswer(inv -> inv.getArgument(0));

        LeaveRequest lr = svc.requestLeave(10L, LeaveType.PAID, start, end, "vacation");
        assertEquals(LeaveStatus.PENDING, lr.getStatus());
        assertEquals(LeaveType.PAID, lr.getType());
        assertEquals(start, lr.getStartDate());
        assertEquals(end, lr.getEndDate());
    }

    @Test
    void requestLeave_overlap_throws() {
        LocalDate start = LocalDate.of(2025, 1, 10);
        LocalDate end   = LocalDate.of(2025, 1, 12);

        when(users.findById(10L)).thenReturn(Optional.of(employee));
        when(leaves.existsOverlappingApprovedOrPending(10L, start, end)).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> svc.requestLeave(10L, LeaveType.PAID, start, end, "x"));
    }

    @Test
    void cancelPending_ok() {
        LeaveRequest lr = LeaveRequest.builder()
                .id(1L).employee(employee)
                .status(LeaveStatus.PENDING)
                .startDate(LocalDate.now()).endDate(LocalDate.now())
                .build();
        when(leaves.findById(1L)).thenReturn(Optional.of(lr));

        LeaveRequest out = svc.cancelPending(10L, 1L);
        assertEquals(LeaveStatus.CANCELLED, out.getStatus());
    }

    @Test
    void cancelPending_wrongUser_throws() {
        User other = User.builder()
                .id(99L)
                .email("o@o.o")
                .password("x")
                .role(Role.EMPLOYEE)
                .active(true)
                .build();

        LeaveRequest lr = LeaveRequest.builder()
                .id(1L)
                .employee(other)
                .status(LeaveStatus.PENDING)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now())
                .build();

        when(leaves.findById(1L)).thenReturn(Optional.of(lr));

        assertThrows(ConflictException.class, () -> svc.cancelPending(10L, 1L));
    }

    @Test
    void approve_whenNoConflict_setsApproved() {
        LeaveRequest lr = LeaveRequest.builder()
                .id(1L).employee(employee)
                .status(LeaveStatus.PENDING)
                .startDate(LocalDate.of(2025,1,10))
                .endDate(LocalDate.of(2025,1,12))
                .build();

        when(leaves.findById(1L)).thenReturn(Optional.of(lr));
        when(leaves.existsOverlappingApprovedOrPending(10L,
                lr.getStartDate(), lr.getEndDate())).thenReturn(false);

        LeaveRequest out = svc.approve(1L);
        assertEquals(LeaveStatus.APPROVED, out.getStatus());
    }

    @Test
    void approve_conflictsWithApproved_throws() {
        LeaveRequest lr = LeaveRequest.builder()
                .id(1L).employee(employee)
                .status(LeaveStatus.PENDING)
                .startDate(LocalDate.of(2025,1,10))
                .endDate(LocalDate.of(2025,1,12))
                .build();

        when(leaves.findById(1L)).thenReturn(Optional.of(lr));
        when(leaves.existsOverlappingApprovedOrPending(10L,
                lr.getStartDate(), lr.getEndDate())).thenReturn(true);

        // add another approved leave overlapping
        LeaveRequest other = LeaveRequest.builder()
                .id(2L).employee(employee)
                .status(LeaveStatus.APPROVED)
                .startDate(LocalDate.of(2025,1,11))
                .endDate(LocalDate.of(2025,1,13))
                .build();
        when(leaves.findByEmployeeIdOrderByStartDateAsc(10L))
                .thenReturn(List.of(lr, other));

        assertThrows(ConflictException.class, () -> svc.approve(1L));
    }

    @Test
    void listForEmployee_userMissing_throws() {
        when(users.findById(10L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> svc.listForEmployee(10L));
    }
}