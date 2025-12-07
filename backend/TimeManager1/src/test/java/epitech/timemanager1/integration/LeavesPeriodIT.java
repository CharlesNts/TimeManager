package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import epitech.timemanager1.entities.*;
import epitech.timemanager1.repositories.LeaveRequestRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Transactional
class LeavesPeriodIT {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository users;
    @Autowired LeaveRequestRepository leaves;

    Long employeeId;

    @BeforeEach
    void seed() {
        User u = User.builder()
                .firstName("Emp").lastName("Planner")
                .email("planner@test.local").password("{noop}x")
                .role(Role.EMPLOYEE).active(true).build();
        employeeId = users.save(u).getId();

        // Inside window: December 2025
        leaves.save(LeaveRequest.builder()
                .employee(u)
                .type(LeaveType.PAID)
                .status(LeaveStatus.APPROVED)
                .startDate(LocalDate.of(2025, 12, 20))
                .endDate(LocalDate.of(2025, 12, 22))
                .reason("Christmas").build());

        // Inside window: February 2026
        leaves.save(LeaveRequest.builder()
                .employee(u)
                .type(LeaveType.PAID)
                .status(LeaveStatus.APPROVED)
                .startDate(LocalDate.of(2026, 2, 10))
                .endDate(LocalDate.of(2026, 2, 12))
                .reason("Winter break").build());

        // Outside window: April 2026
        leaves.save(LeaveRequest.builder()
                .employee(u)
                .type(LeaveType.PAID)
                .status(LeaveStatus.APPROVED)
                .startDate(LocalDate.of(2026, 4, 1))
                .endDate(LocalDate.of(2026, 4, 3))
                .reason("Spring").build());
    }

    @Test
    void window_filters_leaves_between_from_and_to() throws Exception {
        // Window: December 2025 -> March 2026
        mvc.perform(get("/api/leaves/window")
                        .param("employeeId", employeeId.toString())
                        .param("from", "2025-12-01")
                        .param("to",   "2026-03-31")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                // Only December + February leaves should be returned = 2
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].employee.id").value(employeeId))
                .andExpect(jsonPath("$[1].employee.id").value(employeeId));
    }
}