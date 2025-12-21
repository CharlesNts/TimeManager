package epitech.timemanager1.config;

import epitech.timemanager1.events.PasswordResetRequestedEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class KafkaConsumerConfig {

    @Bean
    public ConsumerFactory<String, PasswordResetRequestedEvent>
    passwordResetConsumerFactory() {

        JsonDeserializer<PasswordResetRequestedEvent> deserializer =
                new JsonDeserializer<>(PasswordResetRequestedEvent.class);
        deserializer.addTrustedPackages("epitech.timemanager1.*");

        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        return new org.springframework.kafka.core.DefaultKafkaConsumerFactory<>(
                props,
                new StringDeserializer(),
                deserializer
        );
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, PasswordResetRequestedEvent>
    passwordResetKafkaListenerFactory(
            ConsumerFactory<String, PasswordResetRequestedEvent> cf) {

        ConcurrentKafkaListenerContainerFactory<String, PasswordResetRequestedEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(cf);
        return factory;
    }
}