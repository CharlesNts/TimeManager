package epitech.timemanager1.dto;

import epitech.timemanager1.entities.Role;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserDTOTest {

    @Test
    void shouldBuildUserDTO() {
        UserDTO dto = UserDTO.builder()
                .id(1L)
                .email("test@mail.com")
                .firstName("John")
                .lastName("Doe")
                .role(Role.EMPLOYEE)
                .password("password123")
                .build();

        assertThat(dto.getEmail()).isEqualTo("test@mail.com");
        assertThat(dto.getRole()).isEqualTo(Role.EMPLOYEE);
        assertThat(dto.getPassword()).isEqualTo("password123");
    }

    @Test
    void toString_shouldContainClassName() {
        UserDTO dto = new UserDTO();
        assertThat(dto.toString()).contains("UserDTO");
    }
}