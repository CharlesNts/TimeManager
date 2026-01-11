package epitech.timemanager1.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Data Transfer Object (DTO) representing an authentication response.
 * <p>
 * Returned after a successful login request, containing the JWT token,
 * its type, and the expiration duration.
 * </p>
 */
@Data
@AllArgsConstructor
public class AuthResponse {

    /** The type of token, typically "Bearer". */
    private String tokenType;

    /** The JWT access token used for authenticated API requests. */
    private String accessToken;

    /** The duration in seconds before the token expires. */
    private long expiresIn;
}