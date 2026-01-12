package epitech.timemanager1.events;

import epitech.timemanager1.kafka.KafkaTopics;
import epitech.timemanager1.services.mail.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(
        name = "app.kafka.enabled",
        havingValue = "true",
        matchIfMissing = true
)
public class PasswordResetEmailListener {

    private final MailService mailService;

    @KafkaListener(
            topics = KafkaTopics.PASSWORD_RESET_REQUESTED,
            groupId = "timemanager-mail"
    )
    public void onPasswordResetRequested(PasswordResetRequestedEvent event) {
        log.info("Password reset requested for {}", event.email());
        mailService.sendPasswordResetEmail(event.email(), event.link());
    }
}