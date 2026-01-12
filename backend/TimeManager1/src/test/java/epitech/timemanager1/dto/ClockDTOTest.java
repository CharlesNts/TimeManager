package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
class ClockDTOTest {

    @Test
    void fullCoverage() {
        LocalDateTime now = LocalDateTime.now();

        UserDTO user = UserDTO.builder()
                .id(1L)
                .email("test@test.com")
                .build();

        ClockDTO dto1 = ClockDTO.builder()
                .id(1L)
                .user(user)
                .clockIn(now)
                .build();

        ClockDTO dto2 = new ClockDTO(1L, user, now, null);

        // getters
        assertThat(dto1.getId()).isEqualTo(1L);
        assertThat(dto1.getUser()).isEqualTo(user);
        assertThat(dto1.getClockIn()).isEqualTo(now);

        // setters
        dto2.setClockOut(now);
        assertThat(dto2.getClockOut()).isEqualTo(now);

        // lombok methods
        assertThat(dto1).isEqualTo(dto1);
        dto1.hashCode();
        dto1.toString();
    }
}