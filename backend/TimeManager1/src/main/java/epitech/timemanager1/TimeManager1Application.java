package epitech.timemanager1;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class TimeManager1Application {

    public static void main(String[] args) {
        SpringApplication.run(TimeManager1Application.class, args);
    }

}
