package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class WorkShiftCreateDTOTest {

    @Test
    void shouldSetFieldsCorrectly() {
        LocalDateTime now = LocalDateTime.now();

        WorkShiftCreateDTO dto = new WorkShiftCreateDTO();
        dto.setStartAt(now);
        dto.setEndAt(now.plusHours(8));
        dto.setNote("Morning shift");

        assertThat(dto.getNote()).isEqualTo("Morning shift");
        assertThat(dto.getEndAt()).isAfter(dto.getStartAt());
    }
}