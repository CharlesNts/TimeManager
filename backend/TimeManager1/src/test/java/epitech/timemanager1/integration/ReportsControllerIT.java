package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import epitech.timemanager1.entities.Clock;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.repositories.ClockRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Transactional
class ReportsControllerIT {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository users;
    @Autowired ClockRepository clockRepo;

    long userId;

    @BeforeEach
    void seed() {
        User u = users.save(User.builder()
                .firstName("Emp")
                .lastName("One")
                .email("emp1@test.local")
                .password("{noop}x")
                .role(Role.EMPLOYEE)
                .active(true)
                .build());
        userId = u.getId();

        clockRepo.save(Clock.builder()
                .user(u)
                .clockIn(LocalDateTime.of(2025, 5, 1, 9, 30))
                .clockOut(LocalDateTime.of(2025, 5, 1, 17, 30))
                .build());

        clockRepo.save(Clock.builder()
                .user(u)
                .clockIn(LocalDateTime.of(2025, 5, 2, 9, 0))
                .clockOut(LocalDateTime.of(2025, 5, 2, 17, 0))
                .build());
    }

    @Test
    void isLate_and_hoursBetween() throws Exception {
        // --- is-late ---
        mvc.perform(get("/api/reports/users/{userId}/is-late", userId)
                        .param("date", LocalDate.of(2025, 5, 1).toString())
                        .param("threshold", "09:05"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.userId").value((int) userId))
                .andExpect(jsonPath("$.date").value("2025-05-01"))
                .andExpect(jsonPath("$.threshold").value("09:05:00"))
                .andExpect(jsonPath("$.firstClockIn").value("2025-05-01T09:30:00"))
                .andExpect(jsonPath("$.late").value(true));

        // --- hoursBetween ---
        String resp = mvc.perform(get("/api/reports/users/{userId}/hours", userId)
                        .param("from", "2025-05-01T00:00:00")
                        .param("to", "2025-05-03T00:00:00"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.userId").value((int) userId))
                .andExpect(jsonPath("$.grossHours").value(16.0))
                .andExpect(jsonPath("$.pauseHours").value(0.0))
                .andExpect(jsonPath("$.netHours").value(16.0))
                .andReturn().getResponse().getContentAsString();

        JsonNode json = om.readTree(resp);
        double netHours = json.get("netHours").asDouble();

        assertThat(netHours).isCloseTo(16.0, within(1e-6));
    }
}