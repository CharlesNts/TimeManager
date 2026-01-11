package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser(username = "tester", roles = {"ADMIN"}) // or MANAGER – whatever your SecurityConfig expects
@ActiveProfiles("test")
class TeamMemberIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;

    private long createUser(String tag) throws Exception {
        String email = "member+" + tag + "-" + UUID.randomUUID() + "@example.com";
        String payload = """
            {
              "firstName":"Mem",
              "lastName":"Ber",
              "email":"%s",
              "role":"EMPLOYEE",
              "password":"StrongPass123"
            }
            """.formatted(email);

        String resp = mvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return om.readTree(resp).get("id").asLong();
    }

    private long createTeam(String name, String desc) throws Exception {
        String payload = """
            { "name":"%s", "description":"%s" }
            """.formatted(name, desc);

        String resp = mvc.perform(post("/api/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return om.readTree(resp).get("id").asLong();
    }

    private JsonNode addMember(long teamId, long userId) throws Exception {
        String resp = mvc.perform(post("/api/teams/{teamId}/members/{userId}", teamId, userId))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return om.readTree(resp);
    }

    @Test
    void addMember_thenListMembers_containsJoinedAt() throws Exception {
        long userId = createUser("A");
        long teamId = createTeam("T-" + UUID.randomUUID(), "Alpha");

        JsonNode created = addMember(teamId, userId);
        assertThat(created.get("joinedAt").asText()).isNotBlank(); // auditing populated

        String list = mvc.perform(get("/api/teams/{teamId}/members", teamId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode arr = om.readTree(list);
        assertThat(arr.isArray()).isTrue();
        assertThat(arr.toString()).contains("\"id\":" + userId); // user id appears inside nested user object
    }

    @Test
    void duplicateMembership_gives409() throws Exception {
        long userId = createUser("B");
        long teamId = createTeam("T-" + UUID.randomUUID(), "Beta");

        addMember(teamId, userId);

        mvc.perform(post("/api/teams/{teamId}/members/{userId}", teamId, userId))
                .andExpect(status().isConflict())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("already in team")));
    }

    @Test
    void removeMember_thenListIsEmpty() throws Exception {
        long userId = createUser("C");
        long teamId = createTeam("T-" + UUID.randomUUID(), "Gamma");

        addMember(teamId, userId);

        mvc.perform(delete("/api/teams/{teamId}/members/{userId}", teamId, userId))
                .andExpect(status().isNoContent());

        String list = mvc.perform(get("/api/teams/{teamId}/members", teamId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode arr = om.readTree(list);
        // either empty or does not contain this user
        assertThat(arr.isArray()).isTrue();
        assertThat(arr.toString()).doesNotContain("\"id\":" + userId);
    }

    @Test
    void listTeamsForUser_returnsBothTeams() throws Exception {
        long userId = createUser("D");
        long team1 = createTeam("T-" + UUID.randomUUID(), "Delta");
        long team2 = createTeam("T-" + UUID.randomUUID(), "Epsilon");

        addMember(team1, userId);
        addMember(team2, userId);

        String list = mvc.perform(get("/api/users/{userId}/teams", userId))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(list).contains("Delta");
        assertThat(list).contains("Epsilon");
    }

    @Test
    void addMember_unknownTeamOrUser_gives404() throws Exception {
        long userId = createUser("E");
        long teamId = createTeam("T-" + UUID.randomUUID(), "Zeta");

        // missing team
        mvc.perform(post("/api/teams/{teamId}/members/{userId}", 999_999L, userId))
                .andExpect(status().isNotFound());

        // missing user
        mvc.perform(post("/api/teams/{teamId}/members/{userId}", teamId, 999_999L))
                .andExpect(status().isNotFound());
    }
}