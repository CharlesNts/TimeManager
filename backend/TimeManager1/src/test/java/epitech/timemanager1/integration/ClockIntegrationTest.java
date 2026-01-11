package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClockIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;

    // ---------- helpers -----------------------------------------------------

    private long createUser() throws Exception {
        String email = "member+" + UUID.randomUUID() + "@example.com";
        String body = """
            { "firstName":"Mem", "lastName":"Ber",
              "email":"%s", "role":"EMPLOYEE", "password":"StrongPass123" }
            """.formatted(email);

        MvcResult res = mockMvc.perform(post("/api/users")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/users/")))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andReturn();

        return objectMapper.readTree(res.getResponse().getContentAsByteArray())
                .get("id").asLong();
    }

    private JsonNode postClockIn(long userId, String when) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/users/{uid}/clocks/in", userId)
                        .param("when", when)
                        .with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/users/" + userId + "/clocks/")))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.user.id").value(userId))
                // tolerant to seconds present/absent
                .andExpect(jsonPath("$.clockIn", startsWith(when.substring(0, 16))))
                // null field is omitted thanks to @JsonInclude
                .andExpect(jsonPath("$.clockOut").doesNotExist())
                .andReturn();

        return objectMapper.readTree(res.getResponse().getContentAsByteArray());
    }

    private void postClockOut(long userId, String when) throws Exception {
        mockMvc.perform(post("/api/users/{uid}/clocks/out", userId)
                        .param("when", when)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.user.id").value(userId))
                .andExpect(jsonPath("$.clockOut", startsWith(when.substring(0, 16))));
    }

    // ---------- tests -------------------------------------------------------

    @Test
    void clockIn() throws Exception {
        long userId = createUser();
        postClockIn(userId, "2025-10-08T09:00"); // asserts inside helper
    }

    @Test
    void clockIn_thenClockOut_success() throws Exception {
        long userId = createUser();

        JsonNode inNode = postClockIn(userId, "2025-10-09T09:00");
        long clockId = inNode.get("id").asLong();

        String outWhen = "2025-10-09T17:30";
        mockMvc.perform(post("/api/users/{uid}/clocks/out", userId)
                        .param("when", outWhen)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(clockId))
                .andExpect(jsonPath("$.user.id").value(userId))
                .andExpect(jsonPath("$.clockIn", startsWith("2025-10-09T09:00")))
                .andExpect(jsonPath("$.clockOut", startsWith(outWhen)));
    }

    @Test
    void doubleClockIn_gives409() throws Exception {
        long userId = createUser();

        // first clock-in
        postClockIn(userId, "2025-10-10T10:46:43");

        // second clock-in without clock-out -> conflict
        mockMvc.perform(post("/api/users/{uid}/clocks/in", userId)
                        .param("when", "2025-10-10T11:00")
                        .with(csrf()))
                .andExpect(status().isConflict());
    }

    @Test
    void listRange_filtersByClockIn() throws Exception {
        long userId = createUser();

        // seed three separate (closed) sessions
        postClockIn(userId, "2025-10-08T09:00");
        postClockOut(userId, "2025-10-08T17:00");

        postClockIn(userId, "2025-10-09T10:00");   // <- should be inside range
        postClockOut(userId, "2025-10-09T18:00");

        postClockIn(userId, "2025-10-11T09:00");
        postClockOut(userId, "2025-10-11T17:00");

        // range that should only include the 2025-10-09 item
        mockMvc.perform(get("/api/users/{uid}/clocks/range", userId)
                        .param("from", "2025-10-09T00:00")
                        .param("to",   "2025-10-10T23:59"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].user.id").value(userId))
                .andExpect(jsonPath("$[0].clockIn", startsWith("2025-10-09T10:00")));
    }

    @Test
    void paging_and_sorting() throws Exception {
        long userId = createUser();

        // seed three CLOSED sessions in chronological order
        postClockIn(userId, "2025-10-09T08:00");
        postClockOut(userId, "2025-10-09T08:30");

        postClockIn(userId, "2025-10-09T09:00");
        postClockOut(userId, "2025-10-09T09:30");

        postClockIn(userId, "2025-10-09T11:00");
        postClockOut(userId, "2025-10-09T11:30");

        // first page (size=2) ascending by clockIn => 08:00, 09:00
        mockMvc.perform(get("/api/users/{uid}/clocks", userId)
                        .param("page", "0")
                        .param("size", "2")
                        .param("sort", "clockIn,asc"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].clockIn", startsWith("2025-10-09T08:00")))
                .andExpect(jsonPath("$.content[1].clockIn", startsWith("2025-10-09T09:00")))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(3)));
    }
}