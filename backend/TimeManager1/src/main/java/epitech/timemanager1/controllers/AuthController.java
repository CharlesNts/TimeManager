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

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtTokenService jwtTokenService;
    private final UserService userService;

    @Value("${app.jwt.expiration:3600}")
    private long expiration;

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

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );
        String token = jwtTokenService.generate(String.valueOf(auth));
        return ResponseEntity.ok(new AuthResponse("Bearer", token, expiration));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(@org.springframework.security.core.annotation.AuthenticationPrincipal
                                      org.springframework.security.core.userdetails.User principal) {
        return ResponseEntity.ok(userService.getByEmail(principal.getUsername()));
    }
}