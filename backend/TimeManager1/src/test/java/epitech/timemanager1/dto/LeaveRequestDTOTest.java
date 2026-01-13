package epitech.timemanager1.dto;

import epitech.timemanager1.entities.LeaveStatus;
import epitech.timemanager1.entities.LeaveType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveRequestDTOTest {

    @Test
    void builder_shouldBuildObjectCorrectly() {
        LocalDateTime start = LocalDateTime.of(2026, 1, 10, 9, 0);
        LocalDateTime end = LocalDateTime.of(2026, 1, 15, 18, 0);
        LocalDateTime created = LocalDateTime.now();

        LeaveRequestDTO dto = LeaveRequestDTO.builder()
                .id(1L)
                .employeeId(10L)
                .employeeName("John Doe")
                .approverId(2L)
                .approverName("Manager")
                .type(LeaveType.PAID)
                .status(LeaveStatus.APPROVED)
                .startAt(start)
                .endAt(end)
                .reason("Vacation")
                .createdAt(created)
                .build();

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getEmployeeId()).isEqualTo(10L);
        assertThat(dto.getEmployeeName()).isEqualTo("John Doe");
        assertThat(dto.getApproverId()).isEqualTo(2L);
        assertThat(dto.getApproverName()).isEqualTo("Manager");
        assertThat(dto.getType()).isEqualTo(LeaveType.PAID);
        assertThat(dto.getStatus()).isEqualTo(LeaveStatus.APPROVED);
        assertThat(dto.getStartAt()).isEqualTo(start);
        assertThat(dto.getEndAt()).isEqualTo(end);
        assertThat(dto.getReason()).isEqualTo("Vacation");
        assertThat(dto.getCreatedAt()).isEqualTo(created);
    }

    @Test
    void nullableFields_canBeNull() {
        LeaveRequestDTO dto = LeaveRequestDTO.builder()
                .id(2L)
                .employeeId(20L)
                .employeeName("Alice")
                .type(LeaveType.SICK)
                .status(LeaveStatus.PENDING)
                .build();

        assertThat(dto.getApproverId()).isNull();
        assertThat(dto.getApproverName()).isNull();
        assertThat(dto.getReason()).isNull();
        assertThat(dto.getCreatedAt()).isNull();
    }

    @Test
    void equals_hashCode_toString_shouldWork() {
        LocalDateTime now = LocalDateTime.now();

        LeaveRequestDTO dto1 = LeaveRequestDTO.builder()
                .id(3L)
                .employeeId(30L)
                .employeeName("Bob")
                .type(LeaveType.PAID)
                .status(LeaveStatus.REJECTED)
                .startAt(now)
                .endAt(now.plusDays(1))
                .build();

        LeaveRequestDTO dto2 = LeaveRequestDTO.builder()
                .id(3L)
                .employeeId(30L)
                .employeeName("Bob")
                .type(LeaveType.PAID)
                .status(LeaveStatus.REJECTED)
                .startAt(now)
                .endAt(now.plusDays(1))
                .build();

        assertThat(dto1).isEqualTo(dto2);
        assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
        assertThat(dto1.toString()).isNotNull();
    }
}