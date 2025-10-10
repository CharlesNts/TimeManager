package epitech.timemanager1.controllers;

import epitech.timemanager1.services.PasswordResetService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth/password")
@RequiredArgsConstructor
public class PasswordController {

    private final PasswordResetService resetService;

    // configure in application.yml, fallback to localhost
    @org.springframework.beans.factory.annotation.Value("${app.reset-link-base:https://localhost:5173/reset-password?token=}")
    private String resetLinkBase;

    @PostMapping("/forgot")
    public ResponseEntity<Void> forgot(@RequestBody ForgotRequest req) {
        resetService.requestReset(req.getEmail(), resetLinkBase);
        // Always 200, even if email not found
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@RequestBody ResetRequest req) {
        resetService.resetPassword(req.getToken(), req.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    @Data
    public static class ForgotRequest {
        @Email @NotBlank
        private String email;
    }

    @Data
    public static class ResetRequest {
        @NotBlank
        private String token;
        @NotBlank
        private String newPassword;
    }
}