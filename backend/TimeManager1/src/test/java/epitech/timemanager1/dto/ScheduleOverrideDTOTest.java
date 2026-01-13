package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleOverrideDTOTest {

    @Test
    void builder_shouldBuildObjectCorrectly() {
        LocalDate date = LocalDate.of(2026, 1, 15);

        ScheduleOverrideDTO dto = ScheduleOverrideDTO.builder()
                .id(1L)
                .employeeId(42L)
                .employeeName("Ilias")
                .date(date)
                .field("startAt")
                .value("09:30")
                .reason("Doctor appointment")
                .build();

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getEmployeeId()).isEqualTo(42L);
        assertThat(dto.getEmployeeName()).isEqualTo("Ilias");
        assertThat(dto.getDate()).isEqualTo(date);
        assertThat(dto.getField()).isEqualTo("startAt");
        assertThat(dto.getValue()).isEqualTo("09:30");
        assertThat(dto.getReason()).isEqualTo("Doctor appointment");
    }

    @Test
    void equals_and_hashCode_shouldWork() {
        LocalDate date = LocalDate.of(2026, 1, 15);

        ScheduleOverrideDTO dto1 = ScheduleOverrideDTO.builder()
                .id(1L)
                .employeeId(42L)
                .employeeName("Ilias")
                .date(date)
                .field("startAt")
                .value("09:30")
                .reason("Doctor appointment")
                .build();

        ScheduleOverrideDTO dto2 = ScheduleOverrideDTO.builder()
                .id(1L)
                .employeeId(42L)
                .employeeName("Ilias")
                .date(date)
                .field("startAt")
                .value("09:30")
                .reason("Doctor appointment")
                .build();

        assertThat(dto1).isEqualTo(dto2);
        assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
    }

    @Test
    void toString_shouldNotBeNull() {
        ScheduleOverrideDTO dto = ScheduleOverrideDTO.builder()
                .id(99L)
                .build();

        assertThat(dto.toString()).isNotNull();
        assertThat(dto.toString()).contains("ScheduleOverrideDTO");
    }
}