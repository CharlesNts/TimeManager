package epitech.timemanager1.integration;

import epitech.timemanager1.events.PasswordResetEmailListener;
import epitech.timemanager1.events.PasswordResetRequestedEvent;
import epitech.timemanager1.kafka.KafkaTopics;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.time.LocalDateTime;
import static org.awaitility.Awaitility.await;


public class PasswordResetKafkaIT {
    @Nested
    @SpringBootTest
    @ActiveProfiles("test")
    class PasswordResetKafkaIT1 {

        @MockitoSpyBean
        PasswordResetEmailListener listener;

        @Autowired
        KafkaTemplate<String, PasswordResetRequestedEvent> kafkaTemplate;

        @Test
        void password_reset_event_is_consumed() {

            kafkaTemplate.send(
                    KafkaTopics.PASSWORD_RESET_REQUESTED,
                    new PasswordResetRequestedEvent(
                            1L,
                            "kafka-test@example.com",
                            "http://localhost/reset?token=abc",
                            LocalDateTime.now()
                    )
            );

            org.awaitility.core.ConditionFactory await = await();
            await.atMost(Duration.ofSeconds(5));
            await.untilAsserted(() ->
                    verify(listener).onPasswordResetRequested(any())
            );
        }
    }
}
