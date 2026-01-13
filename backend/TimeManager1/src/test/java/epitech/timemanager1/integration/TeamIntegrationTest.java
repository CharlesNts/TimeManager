package epitech.timemanager1.integration;
import epitech.timemanager1.IntegrationTest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import epitech.timemanager1.dto.TeamDTO;
import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.repositories.TeamRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Team API — Integration Tests")
@WithMockUser(username = "tester", roles = {"EMPLOYEE"}) // <-- this line

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@IntegrationTest
class TeamIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper om;
    @Autowired private TeamRepository teamRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private JdbcTemplate jdbc;


    @BeforeEach
    void clean() {
        jdbc.execute("DELETE FROM team_members");
        jdbc.execute("DELETE FROM clocks");
        jdbc.execute("DELETE FROM teams");
        jdbc.execute("DELETE FROM password_reset_tokens");
        jdbc.execute("DELETE FROM users");
    }



    private static String uniq(String base) {
        return base + "-" + UUID.randomUUID();
    }

    /** Build Team JSON (no manager by default) */
    private String teamJson(String name, String description) throws Exception {
        ObjectNode n = om.createObjectNode();
        n.put("name", name);
        if (description != null) n.put("description", description);
        return om.writeValueAsString(n);
    }

    /** Create a user and return its DTO (password is WRITE_ONLY, so add it manually into JSON). */
    private UserDTO createUser(String email) throws Exception {
        UserDTO req = UserDTO.builder()
                .firstName("Mgr")
                .lastName("User")
                .email(email)
                .role(Role.MANAGER)
                .password("StrongPass123")
                .build();

        ObjectNode node = om.valueToTree(req);
        node.put("password", req.getPassword());

        MvcResult res = mvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(node)))
                .andExpect(status().isCreated())
                .andReturn();

        return om.readValue(res.getResponse().getContentAsString(), UserDTO.class);
    }

    /** Create a team and return its DTO */
    private TeamDTO createTeam(String name, String desc) throws Exception {
        MvcResult res = mvc.perform(post("/api/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teamJson(name, desc)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/teams/")))
                .andReturn();

        return om.readValue(res.getResponse().getContentAsString(), TeamDTO.class);
    }

    // --- tests ---------------------------------------------------------------

    @Test
    @Order(1)
    @DisplayName("Create → Get — happy path")
    void createThenGet() throws Exception {
        String name = uniq("Alpha");
        TeamDTO created = createTeam(name, "Core platform");

        assertThat(created.getId()).isNotNull();
        assertThat(created.getName()).isEqualTo(name);
        assertThat(created.getManager()).isNull();

        mvc.perform(get("/api/teams/" + created.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(name))
                .andExpect(jsonPath("$.manager").doesNotExist());
    }

    @Test
    @Order(2)
    @DisplayName("Duplicate name — second create → 409 Conflict")
    void duplicateName() throws Exception {
        String name = uniq("Beta");
        createTeam(name, "Team B");

        mvc.perform(post("/api/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(teamJson(name, "Another desc")))
                .andExpect(status().isConflict())
                .andExpect(result -> assertThat(result.getResolvedException().getMessage())
                        .contains("Team name already exists"));
    }

    @Test
    @Order(3)
    @DisplayName("Update name/description")
    void updateTeam() throws Exception {
        TeamDTO created = createTeam(uniq("Gamma"), "Old desc");

        // Send only fields we want to change (manager handled by dedicated endpoint)
        ObjectNode patch = om.createObjectNode();
        patch.put("name", uniq("Gamma-Updated"));
        patch.put("description", "New shiny description");

        mvc.perform(put("/api/teams/" + created.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsString(patch)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", startsWith("Gamma-Updated")))
                .andExpect(jsonPath("$.description").value("New shiny description"));
    }

    @Test
    @Order(4)
    @DisplayName("Assign manager via endpoint")
    void assignManager() throws Exception {
        TeamDTO team = createTeam(uniq("Delta"), "Ops");
        UserDTO manager = createUser("manager+" + UUID.randomUUID() + "@example.com");

        mvc.perform(put("/api/teams/{id}/manager/{userId}", team.getId(), manager.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(team.getId()))
                .andExpect(jsonPath("$.manager.id").value(manager.getId()))
                .andExpect(jsonPath("$.manager.email").value(manager.getEmail()));
    }

    @Test
    @Order(5)
    @DisplayName("List by managerId returns only that manager’s teams")
    void listByManager() throws Exception {
        UserDTO managerA = createUser("managerA+" + UUID.randomUUID() + "@example.com");
        UserDTO managerB = createUser("managerB+" + UUID.randomUUID() + "@example.com");

        TeamDTO t1 = createTeam(uniq("Omega"), "A1");
        TeamDTO t2 = createTeam(uniq("Sigma"), "A2");
        TeamDTO t3 = createTeam(uniq("Zeta"), "B1");

        mvc.perform(put("/api/teams/{id}/manager/{userId}", t1.getId(), managerA.getId()))
                .andExpect(status().isOk());
        mvc.perform(put("/api/teams/{id}/manager/{userId}", t2.getId(), managerA.getId()))
                .andExpect(status().isOk());
        mvc.perform(put("/api/teams/{id}/manager/{userId}", t3.getId(), managerB.getId()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/teams").param("managerId", String.valueOf(managerA.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].manager.id").value(managerA.getId()))
                .andExpect(jsonPath("$[1].manager.id").value(managerA.getId()));
    }

    @Test
    @Order(6)
    @DisplayName("List (no managerId) → empty array (by design)")
    void listWithoutManagerId() throws Exception {
        createTeam(uniq("Theta"), "No manager assigned");
        mvc.perform(get("/api/teams"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", isA(java.util.List.class)))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @Order(7)
    @DisplayName("Delete → subsequent GET returns 404")
    void deleteTeam() throws Exception {
        TeamDTO created = createTeam(uniq("Lambda"), "To be deleted");

        mvc.perform(delete("/api/teams/" + created.getId()))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/teams/" + created.getId()))
                .andExpect(status().isNotFound());
    }
}