package epitech.timemanager1.services.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Development and testing implementation of {@link MailService}.
 * <p>
 * Instead of sending real emails, this service logs the reset link
 * to the application logs. It is active under the {@code default},
 * {@code dev}, and {@code test} Spring profiles.
 * </p>
 */
@Profile("test")
@Service
@Slf4j
public class LoggingMailService implements MailService {

    /**
     * Logs the password reset email details instead of sending an actual email.
     *
     * @param to   the recipient's email address
     * @param link the password reset link
     */
    @Async
    @Override
    public void sendPasswordResetEmail(String to, String link) {
        log.info("[DEV MAIL] To: {} | Reset link: {}", to, link);
    }

    @Async
    @Override
    public void sendWelcomeEmail(String to, String firstName) {
        log.info("[DEV MAIL] To: {} | Welcome {}", to, firstName);
    }
}