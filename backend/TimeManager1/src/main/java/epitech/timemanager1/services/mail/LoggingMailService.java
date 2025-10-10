package epitech.timemanager1.services.mail;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Profile({"default","dev","test"})
public class LoggingMailService implements MailService {
    @Override
    public void sendPasswordResetEmail(String to, String link) {
        log.info("[DEV MAIL] To: {} | Reset link: {}", to, link);
    }
}