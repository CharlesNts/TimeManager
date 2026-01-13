package epitech.timemanager1.dto;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class TeamMemberDTOTest {

    @Test
    void shouldCreateTeamMemberDTO() {
        LocalDateTime joined = LocalDateTime.now();

        TeamMemberDTO dto = TeamMemberDTO.builder()
                .joinedAt(joined)
                .build();

        assertThat(dto.getJoinedAt()).isEqualTo(joined);
    }

    @Test
    void equals_shouldWork() {
        TeamMemberDTO a = TeamMemberDTO.builder().build();
        TeamMemberDTO b = TeamMemberDTO.builder().build();

        assertThat(a).isEqualTo(b);
    }
}