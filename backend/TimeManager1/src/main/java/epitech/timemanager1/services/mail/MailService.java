package epitech.timemanager1.services.mail;

public interface MailService {
    void sendPasswordResetEmail(String to, String link);
}