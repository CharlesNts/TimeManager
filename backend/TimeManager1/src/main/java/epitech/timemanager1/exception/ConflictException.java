package epitech.timemanager1.exception;

/**
 * Exception thrown when a conflict occurs, such as a duplicate entry or business rule violation.
 * <p>
 * Typically results in an HTTP 409 Conflict response.
 */
public class ConflictException extends RuntimeException {

    /**
     * Constructs a new ConflictException with the specified detail message.
     *
     * @param message the detail message
     */
    public ConflictException(String message) {
        super(message);
    }
}