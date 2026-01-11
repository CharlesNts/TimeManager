package epitech.timemanager1.services;

import epitech.timemanager1.entities.PasswordResetToken;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.events.PasswordResetRequestedEvent;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.kafka.KafkaTopics;
import epitech.timemanager1.repositories.PasswordResetTokenRepository;
import epitech.timemanager1.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
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

    @Autowired(required = false)
    private KafkaTemplate<String, PasswordResetRequestedEvent> kafka;

    @Value("${app.kafka.enabled:true}")
    private boolean kafkaEnabled;

    private static final int TOKEN_BYTES = 24;
    private static final int TOKEN_TTL_MINUTES = 60;

    @Transactional
    public void requestReset(String email, String resetLinkBase) {
        Optional<User> opt = users.findByEmail(email);
        if (opt.isEmpty()) return;

        User user = opt.get();
        tokens.deleteByUserId(user.getId());

        String token = generateToken();
        PasswordResetToken prt = PasswordResetToken.builder()
                .user(user)
                .token(token)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(TOKEN_TTL_MINUTES))
                .build();

        tokens.saveAndFlush(prt);

        if (kafkaEnabled && kafka != null) {
            kafka.send(
                    KafkaTopics.PASSWORD_RESET_REQUESTED,
                    "password-reset:" + user.getId(),
                    new PasswordResetRequestedEvent(
                            user.getId(),
                            user.getEmail(),
                            resetLinkBase + token,
                            LocalDateTime.now()
                    )
            );
        }
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
    }

    private String generateToken() {
        byte[] buf = new byte[TOKEN_BYTES];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}