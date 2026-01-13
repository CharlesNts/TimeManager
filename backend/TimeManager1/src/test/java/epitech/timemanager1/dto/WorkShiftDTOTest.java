package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class WorkShiftDTOTest {

    @Test
    void shouldBuildWorkShiftDTO() {
        LocalDateTime start = LocalDateTime.now();

        WorkShiftDTO dto = WorkShiftDTO.builder()
                .id(1L)
                .employeeId(5L)
                .teamId(3L)
                .startAt(start)
                .endAt(start.plusHours(8))
                .note("Shift")
                .build();

        assertThat(dto.getEmployeeId()).isEqualTo(5L);
        assertThat(dto.getTeamId()).isEqualTo(3L);
        assertThat(dto.getEndAt()).isAfter(dto.getStartAt());
    }

    @Test
    void equals_shouldWork() {
        WorkShiftDTO a = WorkShiftDTO.builder().id(1L).build();
        WorkShiftDTO b = WorkShiftDTO.builder().id(1L).build();

        assertThat(a).isEqualTo(b);
    }
}