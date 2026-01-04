package epitech.timemanager1.services.mail;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Profile({"dev", "prod"})
@Service
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:no-reply@timemanager.local}")
    private String from;

    @Value("${app.mail.reset.subject:Reset your password}")
    private String resetSubject;

    @Async
    @Override
    public void sendPasswordResetEmail(String to, String link) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject(resetSubject);
        msg.setText(buildResetBody(link));
        mailSender.send(msg);
    }

    @Async
    @Override
    public void sendWelcomeEmail(String to, String firstName) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(from);
        msg.setTo(to);
        msg.setSubject("Welcome to TimeManager 👋");
        msg.setText("""
            Hello %s,

            Welcome to TimeManager!
            Your account has been created successfully.

            — TimeManager Team
            """.formatted(firstName));
        mailSender.send(msg);
    }

    private String buildResetBody(String link) {
        return """
                Hello,

                We received a request to reset your password.
                Click the link below to reset it:

                %s

                If you didn't request this, ignore this email.
                """.formatted(link);
    }
}