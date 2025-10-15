package epitech.timemanager1.controllers;

import epitech.timemanager1.services.PasswordResetService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller responsible for handling password reset operations.
 * <p>
 * Provides endpoints for:
 * <ul>
 *   <li>Requesting a password reset email</li>
 *   <li>Resetting a password using a valid token</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping("/api/auth/password")
@RequiredArgsConstructor
public class PasswordController {

    /** Service responsible for handling password reset logic. */
    private final PasswordResetService resetService;

    /**
     * Base URL used for generating password reset links.
     * <p>Configurable via <code>app.reset-link-base</code> in <code>application.yml</code>.
     * Defaults to <code>https://localhost:5173/reset-password?token=</code>.</p>
     */
    @org.springframework.beans.factory.annotation.Value("${app.reset-link-base:https://localhost:5173/reset-password?token=}")
    private String resetLinkBase;

    /**
     * Handles password reset requests by sending a reset link to the user's email.
     *
     * @param req request containing the user's email address
     * @return {@code 200 OK} regardless of whether the email exists in the system
     */
    @PostMapping("/forgot")
    public ResponseEntity<Void> forgot(@RequestBody ForgotRequest req) {
        resetService.requestReset(req.getEmail(), resetLinkBase);
        // Always 200, even if email not found
        return ResponseEntity.ok().build();
    }

    /**
     * Resets a user's password using a provided token and new password.
     *
     * @param req request containing the reset token and the new password
     * @return {@code 204 No Content} after a successful password reset
     */
    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@RequestBody ResetRequest req) {
        resetService.resetPassword(req.getToken(), req.getNewPassword());
        return ResponseEntity.noContent().build();
    }

    /**
     * Request body for initiating a password reset.
     * <p>Contains the user's email address.</p>
     */
    @Data
    public static class ForgotRequest {
        /** The user's email address. Must be valid and not blank. */
        @Email @NotBlank
        private String email;
    }

    /**
     * Request body for completing a password reset.
     * <p>Contains the reset token and the new password.</p>
     */
    @Data
    public static class ResetRequest {
        /** The reset token sent to the user's email. */
        @NotBlank
        private String token;

        /** The new password to be set. */
        @NotBlank
        private String newPassword;
    }
}