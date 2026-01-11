package epitech.timemanager1.integration;
import epitech.timemanager1.IntegrationTest;

import com.fasterxml.jackson.databind.ObjectMapper;
import epitech.timemanager1.entities.*;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import epitech.timemanager1.repositories.WorkShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@IntegrationTest
@Transactional
class WorkShiftControllerOverlapIT {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired TeamRepository teams;
    @Autowired UserRepository users;
    @Autowired WorkShiftRepository workShifts;

    Long teamId;
    Long empId;

    @BeforeEach
    void seed() {
        User mgr = users.save(User.builder()
                .firstName("M").lastName("Boss")
                .email("m@test.local").password("{noop}x")
                .role(Role.MANAGER).active(true).build());

        Team t = teams.save(Team.builder().name("Ops").manager(mgr).build());
        teamId = t.getId();

        empId = users.save(User.builder()
                .firstName("E").lastName("One")
                .email("e@test.local").password("{noop}x")
                .role(Role.EMPLOYEE).active(true).build()).getId();
    }

    @Test
    void creating_overlapping_shift_for_same_employee_returns_conflict() throws Exception {
        // create first shift
        String s1 = om.writeValueAsString(Map.of(
                "teamId", teamId,
                "employeeId", empId,
                "startAt", "2025-02-01T09:00:00",
                "endAt", "2025-02-01T17:00:00"
        ));

        mvc.perform(post("/api/workshifts")
                        .contentType(MediaType.APPLICATION_JSON).content(s1))
                .andExpect(status().isCreated());

        // attempt overlapping
        String s2 = om.writeValueAsString(Map.of(
                "teamId", teamId,
                "employeeId", empId,
                "startAt", "2025-02-01T16:00:00",
                "endAt", "2025-02-01T18:00:00"
        ));

        mvc.perform(post("/api/workshifts")
                        .contentType(MediaType.APPLICATION_JSON).content(s2))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(containsString("overlapping")));
    }

    @Test
    void unassign_and_assign_back() throws Exception {
        String body = om.writeValueAsString(Map.of(
                "teamId", teamId,
                "employeeId", empId,
                "startAt", "2025-03-05T09:00:00",
                "endAt", "2025-03-05T17:00:00"
        ));

        var createdJson = mvc.perform(post("/api/workshifts")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = om.readTree(createdJson).get("id").asLong();

        mvc.perform(patch("/api/workshifts/{id}/unassign", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").doesNotExist());

        String assign = om.writeValueAsString(Map.of("employeeId", empId));

        mvc.perform(patch("/api/workshifts/{id}/assign", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(assign))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeId").value(empId));
    }
}