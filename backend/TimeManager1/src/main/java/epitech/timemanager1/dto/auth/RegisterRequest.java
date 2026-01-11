package epitech.timemanager1.dto.auth;

import epitech.timemanager1.entities.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Data Transfer Object (DTO) representing a user registration request.
 * <p>
 * Used during the account creation process to provide user details
 * such as name, email, password, phone number, and role.
 * </p>
 */
@Data
public class RegisterRequest {

    /** The user's first name (required, maximum 80 characters). */
    @NotBlank @Size(max = 80)
    private String firstName;

    /** The user's last name (required, maximum 80 characters). */
    @NotBlank @Size(max = 80)
    private String lastName;

    /** The user's email address (required, must be valid and unique). */
    @Email @NotBlank @Size(max = 160)
    private String email;

    /** Optional phone number (maximum 40 characters). */
    @Size(max = 40)
    private String phoneNumber;

    /** The user's password (required). */
    @NotBlank
    private String password;

    /** The user's assigned role (defaults to EMPLOYEE if not provided). */
    private Role role;
}