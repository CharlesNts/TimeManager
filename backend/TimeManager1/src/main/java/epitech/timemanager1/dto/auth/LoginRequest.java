package epitech.timemanager1.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Data Transfer Object (DTO) representing a login request payload.
 * <p>
 * Used to authenticate users with their email and password.
 * </p>
 */
@Data
public class LoginRequest {

    /** The user's email address (must be a valid email format). */
    @Email @NotBlank
    private String email;

    /** The user's password (cannot be blank). */
    @NotBlank
    private String password;
}