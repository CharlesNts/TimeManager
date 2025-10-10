package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("User API — Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@SpringBootTest
@AutoConfigureMockMvc
public class UserIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private JdbcTemplate jdbc;

    private UserDTO testUser;

    @BeforeEach
    void clean() {
        // nukes everything in the right order and resets IDs
        jdbc.execute("TRUNCATE TABLE team_members, clocks, teams, users RESTART IDENTITY CASCADE");
    }

    @BeforeEach
    void setup() {
        // keep DB clean between tests so emails don’t collide
        userRepository.deleteAll();

        testUser = UserDTO.builder()
                .firstName("Alice")
                .lastName("Smith")
                .email(uniqueEmail("alice"))
                .role(Role.EMPLOYEE)
                .password("securepassword123")
                .build();
    }

    private static String uniqueEmail(String prefix) {
        return prefix + "+" + UUID.randomUUID() + "@example.com";
    }

    /** Convert DTO -> JSON, then manually add "password" so WRITE_ONLY doesn’t strip it. */
    private String jsonWithPassword(UserDTO dto) throws Exception {
        ObjectNode node = objectMapper.valueToTree(dto); // password omitted by annotation
        if (dto.getPassword() != null) {
            node.put("password", dto.getPassword()); // add it back explicitly
        }
        return objectMapper.writeValueAsString(node);
    }

    @Test
    @Order(1)
    @DisplayName("Create → Retrieve — happy path")
    void shouldCreateAndRetrieveUser() throws Exception {
        // Create
        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithPassword(testUser)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/users/")))
                .andReturn();

        UserDTO createdUser = objectMapper.readValue(result.getResponse().getContentAsString(), UserDTO.class);
        assertThat(createdUser.getId()).isNotNull();
        assertThat(createdUser.getEmail()).isEqualTo(testUser.getEmail());

        // Retrieve
        mockMvc.perform(get("/api/users/" + createdUser.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testUser.getEmail()))
                .andExpect(jsonPath("$.password").doesNotExist()); // never returned
    }

    @Test
    @Order(2)
    @DisplayName("Validation — missing password → 409 Conflict (service rule)")
    void shouldFailOnMissingPassword() throws Exception {
        testUser.setPassword(null);

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithPassword(testUser)))
                .andExpect(status().isConflict())
                .andExpect(result -> assertThat(result.getResolvedException().getMessage())
                        .contains("Password is required"));
    }

    @Test
    @Order(3)
    @DisplayName("Duplicate email — second create → 409 Conflict")
    void shouldRejectDuplicateEmail() throws Exception {
        String dupEmail = uniqueEmail("amy.wang");
        UserDTO dto = UserDTO.builder()
                .firstName("Amy")
                .lastName("Wang")
                .email(dupEmail)
                .password("anotherStrongPass")
                .build();

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithPassword(dto)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithPassword(dto)))
                .andExpect(status().isConflict())
                .andExpect(result -> assertThat(result.getResolvedException().getMessage())
                        .contains("Email already in use"));
    }

    @Test
    @Order(4)
    @DisplayName("Update — change names, keep password hidden")
    void shouldUpdateUser() throws Exception {
        // Create
        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithPassword(testUser)))
                .andExpect(status().isCreated())
                .andReturn();

        UserDTO createdUser = objectMapper.readValue(result.getResponse().getContentAsString(), UserDTO.class);

        // Update (send known fields to avoid nulling)
        createdUser.setFirstName("Updated");
        createdUser.setLastName("Name");

        mockMvc.perform(put("/api/users/" + createdUser.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createdUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Updated"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @Order(5)
    @DisplayName("List — returns an array")
    void shouldListUsers() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(6)
    @DisplayName("Delete → then GET 404 Not Found")
    void shouldDeleteUser() throws Exception {
        // Create
        MvcResult result = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithPassword(testUser)))
                .andExpect(status().isCreated())
                .andReturn();

        UserDTO createdUser = objectMapper.readValue(result.getResponse().getContentAsString(), UserDTO.class);

        // Delete
        mockMvc.perform(delete("/api/users/" + createdUser.getId()))
                .andExpect(status().isNoContent());

        // Verify deletion
        mockMvc.perform(get("/api/users/" + createdUser.getId()))
                .andExpect(status().isNotFound());
    }
}