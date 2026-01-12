package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportsDTOTest {

    @Test
    void builder_shouldBuildObjectCorrectly() {
        TeamAvgHoursDTO team1 = TeamAvgHoursDTO.builder()
                .teamId(1L)
                .teamName("Backend")
                .avgHours(38.5)
                .build();

        TeamAvgHoursDTO team2 = TeamAvgHoursDTO.builder()
                .teamId(2L)
                .teamName("Frontend")
                .avgHours(40.0)
                .build();

        ReportsDTO dto = ReportsDTO.builder()
                .teamAvgHoursWeek(List.of(team1, team2))
                .latenessRateMonth(0.25)
                .build();

        assertThat(dto.getTeamAvgHoursWeek()).hasSize(2);
        assertThat(dto.getTeamAvgHoursWeek().get(0).getTeamName()).isEqualTo("Backend");
        assertThat(dto.getTeamAvgHoursWeek().get(1).getAvgHours()).isEqualTo(40.0);
        assertThat(dto.getLatenessRateMonth()).isEqualTo(0.25);
    }

    @Test
    void emptyOrNullValues_shouldBeHandled() {
        ReportsDTO dto = ReportsDTO.builder()
                .teamAvgHoursWeek(null)
                .latenessRateMonth(0.0)
                .build();

        assertThat(dto.getTeamAvgHoursWeek()).isNull();
        assertThat(dto.getLatenessRateMonth()).isZero();
    }

    @Test
    void equals_hashCode_toString_shouldWork() {
        ReportsDTO dto1 = ReportsDTO.builder()
                .teamAvgHoursWeek(List.of())
                .latenessRateMonth(0.1)
                .build();

        ReportsDTO dto2 = ReportsDTO.builder()
                .teamAvgHoursWeek(List.of())
                .latenessRateMonth(0.1)
                .build();

        assertThat(dto1).isEqualTo(dto2);
        assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
        assertThat(dto1.toString()).isNotNull();
    }
}