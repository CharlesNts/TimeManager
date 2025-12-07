package epitech.timemanager1.controllers;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.dto.auth.*;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.security.JwtTokenService;
import epitech.timemanager1.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

/**
 * Controller responsible for authentication and user registration.
 * <p>
 * Provides endpoints to register a new user, authenticate existing users,
 * and retrieve the currently authenticated user's information.
 * </p>
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    /** Authentication manager used to validate user credentials. */
    private final AuthenticationManager authManager;

    /** Service used for generating and validating JWT tokens. */
    private final JwtTokenService jwtTokenService;

    /** Service responsible for user-related operations. */
    private final UserService userService;

    /** JWT expiration time in seconds, configurable via application properties. */
    @Value("${app.jwt.expiration:3600}")
    private long expiration;

    /**
     * Registers a new user in the system.
     *
     * @param req the registration request containing user information
     * @return a {@link ResponseEntity} containing the created {@link UserDTO} and HTTP 201 status
     */
    @PostMapping("/register")
    public ResponseEntity<UserDTO> register(@Valid @RequestBody RegisterRequest req) {
        UserDTO dto = UserDTO.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .email(req.getEmail())
                .phoneNumber(req.getPhoneNumber())
                .password(req.getPassword())
                .role(req.getRole() != null ? req.getRole() : Role.EMPLOYEE)
                .build();

        UserDTO created = userService.create(dto);
        return ResponseEntity.created(URI.create("/api/users/" + created.getId())).body(created);
    }

    /**
     * Authenticates a user and returns a JWT access token.
     *
     * @param req the login request containing email and password
     * @return a {@link ResponseEntity} containing the generated JWT token and HTTP 200 status
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );
        String token = jwtTokenService.generate(String.valueOf(auth));
        return ResponseEntity.ok(new AuthResponse("Bearer", token, expiration));
    }

    /**
     * Returns information about the currently authenticated user.
     *
     * @param principal the authenticated user principal
     * @return a {@link ResponseEntity} containing the current {@link UserDTO}
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(@org.springframework.security.core.annotation.AuthenticationPrincipal
                                      org.springframework.security.core.userdetails.User principal) {
        return ResponseEntity.ok(userService.getByEmail(principal.getUsername()));
    }
}