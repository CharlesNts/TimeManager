package epitech.timemanager1.events;

import epitech.timemanager1.kafka.KafkaTopics;
import epitech.timemanager1.services.mail.MailService;
import epitech.timemanager1.services.notification.UserNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserApprovedListener {

    private final UserNotificationService notificationService;

    @KafkaListener(
            topics = KafkaTopics.USER_APPROVED,
            groupId = "timemanager-notifications"
    )
    public void onUserApproved(UserApprovedEvent event) {
        log.info("USER_APPROVED consumed for {}", event.email());

        notificationService.notifyUserApproved(
                event.email(),
                event.firstName()
        );
    }
}