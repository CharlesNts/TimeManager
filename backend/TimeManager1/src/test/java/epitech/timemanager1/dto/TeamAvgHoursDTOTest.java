package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TeamAvgHoursDTOTest {

    @Test
    void shouldBuildAndReadFields() {
        TeamAvgHoursDTO dto = TeamAvgHoursDTO.builder()
                .teamId(1L)
                .teamName("Backend")
                .avgHours(37.5)
                .build();

        assertThat(dto.getTeamId()).isEqualTo(1L);
        assertThat(dto.getTeamName()).isEqualTo("Backend");
        assertThat(dto.getAvgHours()).isEqualTo(37.5);
    }

}