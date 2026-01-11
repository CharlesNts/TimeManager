package epitech.timemanager1.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.kafka.core.KafkaTemplate;

import static org.mockito.Mockito.mock;

/**
 * Test configuration to provide mock beans for Kafka
 * Since we don't deploy Kafka in production, we mock it in tests
 */
@TestConfiguration
public class TestConfig {

    @Bean
    @Primary
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return mock(KafkaTemplate.class);
    }

    @Bean("kafkaTemplate2")
    @Primary
    public KafkaTemplate<String, String> kafkaTemplate2() {
        return mock(KafkaTemplate.class);
    }
}
