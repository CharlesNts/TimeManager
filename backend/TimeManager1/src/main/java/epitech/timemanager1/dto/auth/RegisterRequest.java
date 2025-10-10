package epitech.timemanager1.dto.auth;

import epitech.timemanager1.entities.Role;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank @Size(max = 80)
    private String firstName;
    @NotBlank @Size(max = 80)
    private String lastName;
    @Email @NotBlank @Size(max = 160)
    private String email;
    @Size(max = 40)
    private String phoneNumber;
    @NotBlank
    private String password;

    private Role role;
}