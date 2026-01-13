package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ScheduleTemplateDTOTest {

    @Test
    void builder_shouldBuildObjectCorrectly() {
        ScheduleTemplateDTO dto = ScheduleTemplateDTO.builder()
                .id(1L)
                .teamId(10L)
                .teamName("Backend Team")
                .name("Standard Week")
                .active(true)
                .weeklyPatternJson("{\"mon\":\"9-17\"}")
                .build();

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getTeamId()).isEqualTo(10L);
        assertThat(dto.getTeamName()).isEqualTo("Backend Team");
        assertThat(dto.getName()).isEqualTo("Standard Week");
        assertThat(dto.isActive()).isTrue();
        assertThat(dto.getWeeklyPatternJson()).isEqualTo("{\"mon\":\"9-17\"}");
    }

    @Test
    void equals_and_hashCode_shouldWork() {
        ScheduleTemplateDTO dto1 = ScheduleTemplateDTO.builder()
                .id(1L)
                .teamId(10L)
                .teamName("Backend Team")
                .name("Standard Week")
                .active(true)
                .weeklyPatternJson("{\"mon\":\"9-17\"}")
                .build();

        ScheduleTemplateDTO dto2 = ScheduleTemplateDTO.builder()
                .id(1L)
                .teamId(10L)
                .teamName("Backend Team")
                .name("Standard Week")
                .active(true)
                .weeklyPatternJson("{\"mon\":\"9-17\"}")
                .build();

        assertThat(dto1).isEqualTo(dto2);
        assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
    }


}