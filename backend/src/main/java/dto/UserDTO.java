package epitech.timemanager1.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.time.LocalDateTime;
import epitech.timemanager1.entities.Role;

@JsonInclude(JsonInclude.Include.NON_NULL)
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private Role role;
    private LocalDateTime createdAt;

    // write-only: clients can send it, but we never serialize it back
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
}