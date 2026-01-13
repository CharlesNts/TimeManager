package epitech.timemanager1.dto;

import epitech.timemanager1.entities.LeaveStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LeaveDecisionDTOTest {

    @Test
    void settersAndGetters_shouldWork() {
        LeaveDecisionDTO dto = new LeaveDecisionDTO();

        dto.setDecision(LeaveStatus.APPROVED);
        dto.setNote("Approved, enjoy your leave");

        assertThat(dto.getDecision()).isEqualTo(LeaveStatus.APPROVED);
        assertThat(dto.getNote()).isEqualTo("Approved, enjoy your leave");
    }

    @Test
    void canCreateRejectedDecisionWithoutNote() {
        LeaveDecisionDTO dto = new LeaveDecisionDTO();

        dto.setDecision(LeaveStatus.REJECTED);

        assertThat(dto.getDecision()).isEqualTo(LeaveStatus.REJECTED);
        assertThat(dto.getNote()).isNull();
    }

    @Test
    void toString_equals_hashCode_shouldNotBeNull() {
        LeaveDecisionDTO dto1 = new LeaveDecisionDTO();
        dto1.setDecision(LeaveStatus.APPROVED);
        dto1.setNote("ok");

        LeaveDecisionDTO dto2 = new LeaveDecisionDTO();
        dto2.setDecision(LeaveStatus.APPROVED);
        dto2.setNote("ok");

        assertThat(dto1.toString()).isNotNull();
        assertThat(dto1).isEqualTo(dto2);
        assertThat(dto1.hashCode()).isEqualTo(dto2.hashCode());
    }
}