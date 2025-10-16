package epitech.timemanager1.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import epitech.timemanager1.entities.PasswordResetToken;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.repositories.PasswordResetTokenRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class PasswordResetIntegrationTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository users;
    @Autowired PasswordResetTokenRepository tokens;
    @Autowired PasswordEncoder encoder;

    @Test
    void forgot_and_reset_password_flow() throws Exception {
        // Create a user via API to stay consistent with the app
        String email = "forgot+" + UUID.randomUUID() + "@example.com";
        String body = """
        { "firstName":"Mem","lastName":"Ber","email":"%s","role":"EMPLOYEE","password":"OldPass123" }
        """.formatted(email);

        String userJson = mockMvc.perform(post("/api/users")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long userId = om.readTree(userJson).get("id").asLong();

        // Request reset (always 200)
        mockMvc.perform(post("/api/auth/password/forgot")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsBytes(new Forgot(email))))
                .andExpect(status().isOk());

        // Grab token from repo (since we log mail in dev)
        User user = users.findById(userId).orElseThrow();
        PasswordResetToken token = tokens.findTopByUserOrderByCreatedAtDesc(user).orElseThrow();

        // Reset password
        mockMvc.perform(post("/api/auth/password/reset")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(om.writeValueAsBytes(new Reset(token.getToken(), "NewPass123!"))))
                .andExpect(status().isNoContent());

        // Assert token consumed
        PasswordResetToken used = tokens.findById(token.getId()).orElseThrow();
        assertThat(used.getUsedAt()).isNotNull();

        // Assert password actually changed
        User refreshed = users.findById(userId).orElseThrow();
        assertThat(encoder.matches("NewPass123!", refreshed.getPassword())).isTrue();
        assertThat(encoder.matches("OldPass123", refreshed.getPassword())).isFalse();
    }

    record Forgot(String email) {}
    record Reset(String token, String newPassword) {}
}