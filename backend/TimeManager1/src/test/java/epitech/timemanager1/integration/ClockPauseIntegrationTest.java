package epitech.timemanager1.integration;
import epitech.timemanager1.IntegrationTest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.ClockPause;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.repositories.ClockPauseRepository;
import epitech.timemanager1.repositories.ClockRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@IntegrationTest
@Transactional
class ReportsWithPausesIT {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository users;
    @Autowired ClockRepository clocks;
    @Autowired ClockPauseRepository pauses;

    long userId;

    @BeforeEach
    void seed() {
        var u = users.save(User.builder()
                .firstName("Emp").lastName("Breaky")
                .email("break@test.local").password("{noop}x")
                .role(Role.EMPLOYEE).active(true).build());
        userId = u.getId();

        // 2025-06-10: 09:00 → 17:00 (8h) with 45 min total breaks = 7h15 (7.25h)
        Clock c = clocks.save(Clock.builder()
                .user(u)
                .clockIn(LocalDateTime.of(2025, 6, 10, 9, 0))
                .clockOut(LocalDateTime.of(2025, 6, 10, 17, 0))
                .build());

        pauses.save(ClockPause.builder()
                .clock(c)
                .startAt(LocalDateTime.of(2025, 6, 10, 12, 0))
                .endAt(LocalDateTime.of(2025, 6, 10, 12, 30))
                .note("lunch").build());
        pauses.save(ClockPause.builder()
                .clock(c)
                .startAt(LocalDateTime.of(2025, 6, 10, 15, 0))
                .endAt(LocalDateTime.of(2025, 6, 10, 15, 15))
                .note("coffee").build());
    }

    @Test
    void hoursBetween_subtracts_pauses() throws Exception {
        var resp = mvc.perform(get("/api/reports/users/{uid}/hours", userId)
                        .param("from", "2025-06-10T00:00:00")
                        .param("to",   "2025-06-11T00:00:00"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode node = om.readTree(resp);

        double grossHours = node.get("grossHours").asDouble();
        double pauseHours = node.get("pauseHours").asDouble();
        double netHours   = node.get("netHours").asDouble();

        // Gross should be full 8h
        assertThat(grossHours).isCloseTo(8.0, within(1e-6));
        // 45 minutes of pause -> 0.75h
        assertThat(pauseHours).isCloseTo(0.75, within(1e-6));
        // Net should be 7.25h
        assertThat(netHours).isCloseTo(7.25, within(1e-6));
    }
}