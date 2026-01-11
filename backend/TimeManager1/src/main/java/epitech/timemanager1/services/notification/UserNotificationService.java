package epitech.timemanager1.services.notification;

import epitech.timemanager1.services.mail.MailService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserNotificationService {

    private final MailService mailService;

    public void notifyUserApproved(String email, String firstName) {
        mailService.sendWelcomeEmail(email, firstName);
    }

    public void notifyUserRejected(String email, String firstName, String reason) {
        mailService.sendRejectionEmail(email, firstName, reason);
    }
}