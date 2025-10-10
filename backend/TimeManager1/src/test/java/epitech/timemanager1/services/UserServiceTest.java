package epitech.timemanager1.services;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepo;
    @InjectMocks UserService service;

    private User sampleEntity(Long id, String email) {
        return User.builder()
                .id(id)
                .firstName("John")
                .lastName("Doe")
                .email(email)
                .phoneNumber("123")
                .password("hashed")
                .role(Role.EMPLOYEE)
                .build();
    }

    @Test
    void create_ok() {
        UserDTO dto = UserDTO.builder()
                .firstName("John")
                .lastName("Doe")
                .email("j@d.com")
                .phoneNumber("123")
                .role(Role.MANAGER)
                .password("clear") // write-only; required by service
                .build();

        when(userRepo.existsByEmail("j@d.com")).thenReturn(false);
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(10L);
            return u;
        });

        UserDTO saved = service.create(dto);

        assertNotNull(saved.getId());
        assertEquals("John", saved.getFirstName());
        assertEquals("j@d.com", saved.getEmail());
        // password is not exposed in DTO (write-only)
    }

    @Test
    void create_conflict_when_email_taken() {
        UserDTO dto = UserDTO.builder().email("j@d.com").password("x").build();
        when(userRepo.existsByEmail("j@d.com")).thenReturn(true);
        assertThrows(ConflictException.class, () -> service.create(dto));
        verify(userRepo, never()).save(any());
    }

    @Test
    void get_ok() {
        when(userRepo.findById(1L)).thenReturn(Optional.of(sampleEntity(1L, "a@b.c")));
        UserDTO dto = service.get(1L);
        assertEquals(1L, dto.getId());
        assertEquals("a@b.c", dto.getEmail());
    }

    @Test
    void get_not_found() {
        when(userRepo.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> service.get(1L));
    }

    @Test
    void list_ok() {
        when(userRepo.findAll()).thenReturn(List.of(
                sampleEntity(1L, "a@b.c"),
                sampleEntity(2L, "b@c.d")
        ));
        var list = service.list();
        assertEquals(2, list.size());
    }

    @Test
    void searchByName_maps_page() {
        Page<User> page = new PageImpl<>(List.of(sampleEntity(1L, "a@b.c")));
        when(userRepo.findByLastNameContainingIgnoreCaseOrFirstNameContainingIgnoreCase(eq("jo"), eq("jo"), any()))
                .thenReturn(page);

        Page<UserDTO> result = service.searchByName("jo", PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("a@b.c", result.getContent().get(0).getEmail());
    }

    @Test
    void update_ok_changes_fields_and_email_unique() {
        User existing = sampleEntity(1L, "old@x.com");
        when(userRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepo.existsByEmail("new@x.com")).thenReturn(false);

        UserDTO patch = UserDTO.builder()
                .firstName("Jane")
                .email("new@x.com")
                .password("newpass")
                .role(Role.CEO)
                .build();

        UserDTO updated = service.update(1L, patch);

        assertEquals("Jane", updated.getFirstName());
        assertEquals("new@x.com", updated.getEmail());
        assertEquals(Role.CEO, updated.getRole());
        // password not exposed
    }

    @Test
    void update_conflict_when_email_taken() {
        User existing = sampleEntity(1L, "old@x.com");
        when(userRepo.findById(1L)).thenReturn(Optional.of(existing));
        when(userRepo.existsByEmail("new@x.com")).thenReturn(true);

        UserDTO patch = UserDTO.builder().email("new@x.com").build();

        assertThrows(ConflictException.class, () -> service.update(1L, patch));
    }

    @Test
    void delete_ok() {
        when(userRepo.existsById(1L)).thenReturn(true);
        service.delete(1L);
        verify(userRepo).deleteById(1L);
    }

    @Test
    void delete_not_found() {
        when(userRepo.existsById(1L)).thenReturn(false);
        assertThrows(NotFoundException.class, () -> service.delete(1L));
    }
}