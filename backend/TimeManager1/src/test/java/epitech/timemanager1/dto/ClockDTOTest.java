package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ClockDTOTest {

    @Test
    void noArgsConstructor_shouldCreateEmptyObject() {
        ClockDTO dto = new ClockDTO();

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isNull();
        assertThat(dto.getUser()).isNull();
        assertThat(dto.getClockIn()).isNull();
        assertThat(dto.getClockOut()).isNull();
    }

    @Test
    void allArgsConstructor_shouldSetAllFields() {
        LocalDateTime in = LocalDateTime.of(2025, 1, 10, 9, 0);
        LocalDateTime out = LocalDateTime.of(2025, 1, 10, 17, 0);

        UserDTO user = UserDTO.builder()
                .id(1L)
                .email("user@test.com")
                .build();

        ClockDTO dto = new ClockDTO(10L, user, in, out);

        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getUser()).isEqualTo(user);
        assertThat(dto.getClockIn()).isEqualTo(in);
        assertThat(dto.getClockOut()).isEqualTo(out);
    }

    @Test
    void builder_shouldBuildCorrectObject() {
        LocalDateTime in = LocalDateTime.now();

        ClockDTO dto = ClockDTO.builder()
                .id(5L)
                .clockIn(in)
                .build();

        assertThat(dto.getId()).isEqualTo(5L);
        assertThat(dto.getClockIn()).isEqualTo(in);
        assertThat(dto.getClockOut()).isNull();
        assertThat(dto.getUser()).isNull();
    }

    @Test
    void settersAndGetters_shouldWork() {
        ClockDTO dto = new ClockDTO();
        LocalDateTime now = LocalDateTime.now();

        dto.setId(99L);
        dto.setClockIn(now);

        assertThat(dto.getId()).isEqualTo(99L);
        assertThat(dto.getClockIn()).isEqualTo(now);
    }
}