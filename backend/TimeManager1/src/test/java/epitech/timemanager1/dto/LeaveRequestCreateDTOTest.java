package epitech.timemanager1.dto;

import epitech.timemanager1.entities.LeaveType;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveRequestCreateDTOTest {

    @Test
    void settersAndGetters_shouldWork() {
        LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();

        LocalDateTime start = LocalDateTime.of(2026, 1, 10, 9, 0);
        LocalDateTime end = LocalDateTime.of(2026, 1, 12, 18, 0);

        dto.setType(LeaveType.PAID);
        dto.setStartAt(start);
        dto.setEndAt(end);
        dto.setReason("Family vacation");

        assertThat(dto.getType()).isEqualTo(LeaveType.PAID);
        assertThat(dto.getStartAt()).isEqualTo(start);
        assertThat(dto.getEndAt()).isEqualTo(end);
        assertThat(dto.getReason()).isEqualTo("Family vacation");
    }

    @Test
    void canCreateWithoutOptionalReason() {
        LeaveRequestCreateDTO dto = new LeaveRequestCreateDTO();

        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusDays(2);

        dto.setType(LeaveType.SICK);
        dto.setStartAt(start);
        dto.setEndAt(end);

        assertThat(dto.getType()).isEqualTo(LeaveType.SICK);
        assertThat(dto.getStartAt()).isEqualTo(start);
        assertThat(dto.getEndAt()).isEqualTo(end);
        assertThat(dto.getReason()).isNull();
    }

    @Test
    void equals_hashCode_toString_shouldWork() {
        LocalDateTime start = LocalDateTime.of(2026, 2, 1, 9, 0);
        LocalDateTime end = start.plusDays(1);

        LeaveRequestCreateDTO dto1 = new LeaveRequestCreateDTO();
        dto1.setType(LeaveType.PAID);
        dto1.setStartAt(start);
        dto1.setEndAt(end);
        dto1.setReason("Test");

        LeaveRequestCreateDTO dto2 = new LeaveRequestCreateDTO();
        dto2.setType(LeaveType.PAID);
        dto2.setStartAt(start);
        dto2.setEndAt(end);
        dto2.setReason("Test");

        assertThat(dto1).isEqualTo(dto2);
        assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
        assertThat(dto1.toString()).isNotNull();
    }
}