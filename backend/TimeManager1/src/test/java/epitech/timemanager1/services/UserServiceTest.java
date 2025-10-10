package epitech.timemanager1.services;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.mapper.UserMapper;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserMapper userMapper = Mappers.getMapper(UserMapper.class);

    private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userService = new UserService(userRepository, userMapper, passwordEncoder);
    }

    private UserDTO getSampleUserDTO() {
        return UserDTO.builder()
                .firstName("John")
                .lastName("Doe")
                .email("john@example.com")
                .phoneNumber("0600000000")
                .password("secret123")
                .role(Role.EMPLOYEE)
                .createdAt(LocalDateTime.now())
                .build();
    }

    private User getSampleUser() {
        User user = new User();
        user.setId(1L);
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setEmail("john@example.com");
        user.setPhoneNumber("0600000000");
        user.setPassword("encodedPass");
        user.setRole(Role.EMPLOYEE);
        user.setCreatedAt(LocalDateTime.now());
        user.setActive(false);
        return user;
    }

    @Test
    @DisplayName("Should create user successfully")
    void shouldCreateUser() {
        UserDTO dto = getSampleUserDTO();

        when(userRepository.existsByEmail(dto.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encodedPass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        UserDTO result = userService.create(dto);

        assertNotNull(result.getId());
        assertEquals("John", result.getFirstName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw when email already used")
    void shouldRejectDuplicateEmail() {
        UserDTO dto = getSampleUserDTO();
        when(userRepository.existsByEmail(dto.getEmail())).thenReturn(true);

        assertThrows(ConflictException.class, () -> userService.create(dto));
    }

    @Test
    @DisplayName("Should throw when password is missing")
    void shouldRejectNoPassword() {
        UserDTO dto = getSampleUserDTO();
        dto.setPassword(null);

        assertThrows(ConflictException.class, () -> userService.create(dto));
    }

    @Test
    @DisplayName("Should get user by ID")
    void shouldGetUser() {
        User user = getSampleUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDTO result = userService.get(1L);

        assertEquals("John", result.getFirstName());
        verify(userRepository).findById(1L);
    }

    @Test
    @DisplayName("Should throw when user not found")
    void shouldThrowNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> userService.get(1L));
    }

    @Test
    @DisplayName("Should approve user")
    void shouldApproveUser() {
        User user = getSampleUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        userService.approveUser(1L);

        assertTrue(user.isActive());
        verify(userRepository).save(user);
    }
}