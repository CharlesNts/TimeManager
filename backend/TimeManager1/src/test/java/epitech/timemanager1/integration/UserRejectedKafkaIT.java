package epitech.timemanager1.integration;
import epitech.timemanager1.IntegrationTest;

import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.repositories.UserRepository;
import epitech.timemanager1.services.UserService;
import epitech.timemanager1.services.mail.MailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

@IntegrationTest
@EmbeddedKafka(
        topics = "timemanager.user-rejected",
        partitions = 1
)
class UserRejectedKafkaIT {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private MailService mailService;

    @Test
    void user_rejected_event_is_consumed_and_mail_sent() {
        // GIVEN — unique email to avoid DB collisions
        String email = "rejected+" + UUID.randomUUID() + "@test.com";

        User user = User.builder()
                .email(email)
                .firstName("Rejected")
                .lastName("User")
                .password("encoded")
                .role(Role.EMPLOYEE)
                .active(true)
                .build();

        user = userRepository.save(user);

        // WHEN
        userService.rejectUser(user.getId());

        // THEN (async Kafka → listener → notification → mail)
        verify(mailService, timeout(5000))
                .sendRejectionEmail(
                        eq(email),
                        eq("Rejected"),
                        contains("rejected")
                );
    }
}