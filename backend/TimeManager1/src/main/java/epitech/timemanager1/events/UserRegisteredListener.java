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
public class UserRegisteredListener {

    private final MailService mailService;

    @KafkaListener(
            topics = KafkaTopics.USER_REGISTERED,
            groupId = "timemanager-mail"
    )
    public void onUserRegistered(UserRegisteredEvent event) {
        log.info(
                "New user registered: id={}, email={}",
                event.userId(),
                event.email()
        );

        mailService.sendWelcomeEmail(
                event.email(),
                event.firstName()
        );
    }
}