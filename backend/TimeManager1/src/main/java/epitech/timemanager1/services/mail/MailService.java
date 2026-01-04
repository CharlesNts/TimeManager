package epitech.timemanager1.services.mail;

/**
 * Service interface for handling email-related operations.
 * <p>
 * Provides methods for sending different types of emails, such as
 * password reset links or notifications.
 * </p>
 */
public interface MailService {

    /**
     * Sends a password reset email to the specified recipient.
     *
     * @param to   the recipient's email address
     * @param link the password reset link to include in the email
     */
    void sendPasswordResetEmail(String to, String link);
    void sendWelcomeEmail(String to, String firstName);

}