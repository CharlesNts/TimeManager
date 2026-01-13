package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class TeamDTOTest {

    @Test
    void shouldBuildTeamDTO() {
        LocalDateTime now = LocalDateTime.now();

        TeamDTO dto = TeamDTO.builder()
                .id(1L)
                .name("Dev Team")
                .description("Core devs")
                .createdAt(now)
                .build();

        assertThat(dto.getName()).isEqualTo("Dev Team");
        assertThat(dto.getDescription()).isEqualTo("Core devs");
        assertThat(dto.getCreatedAt()).isEqualTo(now);
    }

    @Test
    void settersAndGetters_shouldWork() {
        TeamDTO dto = new TeamDTO();
        dto.setName("QA");

        assertThat(dto.getName()).isEqualTo("QA");
    }
}