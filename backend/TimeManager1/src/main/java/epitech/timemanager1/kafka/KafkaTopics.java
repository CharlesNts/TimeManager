package epitech.timemanager1.kafka;

public final class KafkaTopics {

    private KafkaTopics() {}

    /** Fired when a user requests a password reset */
    public static final String PASSWORD_RESET_REQUESTED =
            "timemanager.password-reset.requested";

    public static final String USER_REGISTERED =
            "timemanager.user-registered";

    public static final String USER_APPROVED =
            "timemanager.user-approved";

    public static final String USER_REJECTED =
            "timemanager.user-rejected";
}