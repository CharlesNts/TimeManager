package epitech.timemanager1.integration;
import epitech.timemanager1.IntegrationTest;

import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.repositories.UserRepository;
import epitech.timemanager1.services.UserService;
import epitech.timemanager1.services.mail.MailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.test.annotation.DirtiesContext;

import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

@IntegrationTest
@EmbeddedKafka(
        topics = {
                "timemanager.user-approved"
        },
        partitions = 1
)
@DirtiesContext
class UserApprovalKafkaIT {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private MailService mailService;

    @Test
    void user_approved_event_is_consumed_and_mail_sent() {
        // GIVEN
        User user = User.builder()
                .email("approved@test.com")
                .firstName("Approved")
                .lastName("User")
                .password("encoded")
                .role(Role.EMPLOYEE)
                .active(false)
                .build();

        user = userRepository.save(user);

        // WHEN
        userService.approveUser(user.getId());

        // THEN (async → wait up to 5s)
        verify(mailService, timeout(5000))
                .sendWelcomeEmail("approved@test.com", "Approved");
    }
}