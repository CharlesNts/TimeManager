package epitech.timemanager1.exception;

/**
 * Exception thrown when a requested resource is not found.
 * <p>
 * Typically results in an HTTP 404 Not Found response.
 */
public class NotFoundException extends RuntimeException {

    /**
     * Constructs a new NotFoundException with the specified detail message.
     *
     * @param message the detail message
     */
    public NotFoundException(String message) {
        super(message);
    }
}