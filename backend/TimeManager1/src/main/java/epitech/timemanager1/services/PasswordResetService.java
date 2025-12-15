// src/main/java/epitech/timemanager1/services/PasswordResetService.java
package epitech.timemanager1.services;

import epitech.timemanager1.entities.PasswordResetToken;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.repositories.PasswordResetTokenRepository;
import epitech.timemanager1.repositories.UserRepository;
import epitech.timemanager1.services.mail.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

/**
 * Service responsible for handling password reset operations.
 * <p>
 * This service provides secure password reset functionality, including:
 * <ul>
 *   <li>Generating and persisting password reset tokens</li>
 *   <li>Sending reset links via email</li>
 *   <li>Validating and consuming tokens when resetting a password</li>
 * </ul>
 * </p>
 */
@Component
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    /** Number of random bytes to generate for the token. */
    private static final int TOKEN_BYTES = 24;

    /** Duration (in minutes) before a password reset token expires. */
    private static final int TOKEN_TTL_MINUTES = 60;

    /**
     * Initiates a password reset request for a given email address.
     * <p>
     * If the user exists, a secure token is generated and stored,
     * and a password reset link is sent to the user via email.
     * This method never reveals whether a user exists, ensuring privacy.
     * </p>
     *
     * @param email         the email address of the user requesting a password reset
     * @param resetLinkBase the base URL for the reset link (e.g., "https://app.com/reset?token=")
     */
    @Transactional
    public void requestReset(String email, String resetLinkBase) {
        // Always respond OK from controller; do not reveal user existence
        Optional<User> opt = users.findByEmail(email);
        if (opt.isEmpty()) return;

        User user = opt.get();

        // (Optional) revoke old tokens for this user
        tokens.deleteByUserId(user.getId());

        String token = generateToken();
        PasswordResetToken prt = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(TOKEN_TTL_MINUTES))
                .build();
        tokens.save(prt);
        tokens.flush();

        String link = resetLinkBase + token;
        mailService.sendPasswordResetEmail(user.getEmail(), link);
    }

    /**
     * Resets the user's password using a valid reset token.
     * <p>
     * The token must be valid, unexpired, and unused. Once consumed,
     * it cannot be reused. The user's password is updated securely.
     * </p>
     *
     * @param token       the reset token sent to the user
     * @param newPassword the new password to set for the user
     * @throws ConflictException if the token is invalid, expired, or already used
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken prt = tokens.findByToken(token)
                .orElseThrow(() -> new ConflictException("Invalid or expired token"));

        if (prt.isConsumed() || prt.isExpired()) {
            throw new ConflictException("Invalid or expired token");
        }

        User user = prt.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        prt.setUsedAt(LocalDateTime.now());
        // JPA will flush both changes automatically
    }

    /**
     * Generates a secure, URL-safe random token for password reset purposes.
     *
     * @return a Base64 URL-encoded token string
     */
    private String generateToken() {
        byte[] buf = new byte[TOKEN_BYTES];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}