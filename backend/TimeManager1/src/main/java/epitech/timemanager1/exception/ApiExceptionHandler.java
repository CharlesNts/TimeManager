package epitech.timemanager1.exception;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Global exception handler for the application.
 * <p>
 * Converts application exceptions into structured HTTP responses.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    /**
     * Handles custom NotFoundException.
     *
     * @param ex the exception
     * @return 404 Not Found with error message
     */
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<?> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(404).body(Map.of("error", ex.getMessage()));
    }

    /**
     * Handles JPA EntityNotFoundException.
     *
     * @param ex the exception
     * @return 404 Not Found with error message
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<?> handleEntityNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(404).body(Map.of("error", ex.getMessage()));
    }

    /**
     * Handles custom ConflictException.
     *
     * @param ex the exception
     * @return 409 Conflict with error message
     */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<?> handleConflict(ConflictException ex) {
        return ResponseEntity.status(409).body(Map.of("error", ex.getMessage()));
    }
}