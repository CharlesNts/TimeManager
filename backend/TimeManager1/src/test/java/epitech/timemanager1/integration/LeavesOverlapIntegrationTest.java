package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import epitech.timemanager1.dto.LeaveDecisionDTO;
import epitech.timemanager1.dto.LeaveRequestCreateDTO;
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

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Transactional
class LeavesControllerOverlapIT {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository users;
    @Autowired LeaveRequestRepository leaves;

    Long employeeId;

    @BeforeEach
    void seed() {
        User u = User.builder()
                .firstName("Emp").lastName("One")
                .email("emp1@test.local").password("{noop}x")
                .role(Role.EMPLOYEE).active(true).build();
        employeeId = users.save(u).getId();
    }

    @Test
    void overlapping_with_pending_is_rejected() throws Exception {
        leaves.save(LeaveRequest.builder()
                .employee(users.getReferenceById(employeeId))
                .type(LeaveType.PAID)
                .status(LeaveStatus.PENDING)
                .startDate(java.time.LocalDate.of(2025, 4, 10))
                .endDate(java.time.LocalDate.of(2025, 4, 12))
                .reason("seed-pending")
                .build());

        var req = new LeaveRequestCreateDTO();
        req.setType(LeaveType.PAID);
        req.setStartAt(java.time.LocalDateTime.of(2025, 4, 11, 0, 0));
        req.setEndAt(java.time.LocalDateTime.of(2025, 4, 13, 0, 0));

        mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(containsString("Overlaps")));
    }

    @Test
    void overlapping_leave_is_rejected_with_conflict() throws Exception {
        // create an APPROVED leave in repo to force an overlap
        leaves.save(LeaveRequest.builder()
                .employee(users.getReferenceById(employeeId))
                .type(LeaveType.PAID)
                .status(LeaveStatus.APPROVED)
                .startDate(java.time.LocalDate.of(2025,1,10))
                .endDate(java.time.LocalDate.of(2025,1,12))
                .reason("seed")
                .build());

        LeaveRequestCreateDTO req = new LeaveRequestCreateDTO();
        req.setType(LeaveType.PAID);
        req.setStartAt(LocalDateTime.of(2025,1,11,0,0));
        req.setEndAt(LocalDateTime.of(2025,1,13,0,0));
        req.setReason("overlap please");

        mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().is4xxClientError())
                .andExpect(content().string(containsString("Overlaps")));
    }

    @Test
    void approve_pending_succeeds() throws Exception {
        // create a pending via API
        LeaveRequestCreateDTO req = new LeaveRequestCreateDTO();
        req.setType(LeaveType.SICK);
        req.setStartAt(LocalDateTime.of(2025,1,20,0,0));
        req.setEndAt(LocalDateTime.of(2025,1,22,0,0));
        req.setReason("flu");

        String created = mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long leaveId = om.readTree(created).get("id").asLong();

        var decision = new LeaveDecisionDTO();
        decision.setDecision(LeaveStatus.APPROVED);
        decision.setNote("ok");

        mvc.perform(post("/api/leaves/{id}/decision", leaveId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(decision)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void cancel_pending_only_by_owner() throws Exception {
        var req = new LeaveRequestCreateDTO();
        req.setType(LeaveType.SICK);
        req.setStartAt(java.time.LocalDateTime.of(2025, 3, 1, 0, 0));
        req.setEndAt(java.time.LocalDateTime.of(2025, 3, 3, 0, 0));

        String created = mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long id = om.readTree(created).get("id").asLong();

        Long otherId = users.save(User.builder()
                .firstName("O").lastName("T")
                .email("other@test.local").password("{noop}x")
                .role(Role.EMPLOYEE).active(true).build()).getId();

        mvc.perform(post("/api/leaves/{id}/cancel", id)
                        .param("employeeId", otherId.toString()))
                .andExpect(status().is4xxClientError());

        mvc.perform(post("/api/leaves/{id}/cancel", id)
                        .param("employeeId", employeeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void reject_sets_status_and_note() throws Exception {
        var req = new LeaveRequestCreateDTO();
        req.setType(LeaveType.PAID);
        req.setStartAt(java.time.LocalDateTime.of(2025, 2, 10, 0, 0));
        req.setEndAt(java.time.LocalDateTime.of(2025, 2, 12, 0, 0));
        req.setReason("vac");

        String created = mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long id = om.readTree(created).get("id").asLong();

        var decision = new LeaveDecisionDTO();
        decision.setDecision(LeaveStatus.REJECTED);
        decision.setNote("nope");

        mvc.perform(post("/api/leaves/{id}/decision", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(decision)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.reason").value("nope"));
    }

    // ---------- NEW TESTS FOR UPDATE + DELETE ----------

    @Test
    void update_pending_leave_succeeds() throws Exception {
        // 1) Create a pending leave
        LeaveRequestCreateDTO create = new LeaveRequestCreateDTO();
        create.setType(LeaveType.PAID);
        create.setStartAt(LocalDateTime.of(2025, 5, 1, 0, 0));
        create.setEndAt(LocalDateTime.of(2025, 5, 3, 0, 0));
        create.setReason("initial");

        String created = mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(create)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long id = om.readTree(created).get("id").asLong();

        // 2) Update it via PUT
        LeaveRequestCreateDTO update = new LeaveRequestCreateDTO();
        update.setType(LeaveType.PAID);
        update.setStartAt(LocalDateTime.of(2025, 5, 2, 0, 0));
        update.setEndAt(LocalDateTime.of(2025, 5, 4, 0, 0));
        update.setReason("updated reason");

        mvc.perform(put("/api/leaves/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reason").value("updated reason"));
    }

    @Test
    void delete_pending_leave_succeeds() throws Exception {
        // 1) Create a pending leave
        LeaveRequestCreateDTO create = new LeaveRequestCreateDTO();
        create.setType(LeaveType.PAID);
        create.setStartAt(LocalDateTime.of(2025, 6, 1, 0, 0));
        create.setEndAt(LocalDateTime.of(2025, 6, 3, 0, 0));
        create.setReason("to be deleted");

        String created = mvc.perform(post("/api/leaves")
                        .param("employeeId", employeeId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(create)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long id = om.readTree(created).get("id").asLong();

        // 2) Delete it
        mvc.perform(delete("/api/leaves/{id}", id))
                .andExpect(status().isNoContent());

        // 3) Verify it no longer appears in the employee's list
        mvc.perform(get("/api/leaves")
                        .param("employeeId", employeeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
        // Optional: if nothing else exists, you can assert length 0:
        // .andExpect(jsonPath("$.length()").value(0));
    }
}