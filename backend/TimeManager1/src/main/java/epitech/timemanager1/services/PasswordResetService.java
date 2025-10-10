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

@Component
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    private static final int TOKEN_BYTES = 24;
    private static final int TOKEN_TTL_MINUTES = 60;

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

        String link = resetLinkBase + token;
        mailService.sendPasswordResetEmail(user.getEmail(), link);
    }

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
        // JPA will flush both changes
    }

    private String generateToken() {
        byte[] buf = new byte[TOKEN_BYTES];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}