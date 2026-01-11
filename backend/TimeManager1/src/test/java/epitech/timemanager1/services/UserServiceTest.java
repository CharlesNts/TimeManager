package epitech.timemanager1.services;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.events.UserRegisteredEvent;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.mapper.UserMapper;
import epitech.timemanager1.repositories.TeamMemberRepository;
import epitech.timemanager1.repositories.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private KafkaTemplate<String, UserRegisteredEvent> userRegisteredKafkaTemplate;

    @Mock
    private KafkaTemplate<String, Object> genericKafkaTemplate;

    private final UserMapper userMapper = Mappers.getMapper(UserMapper.class);

    private UserService userService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);

        when(userRegisteredKafkaTemplate.send(anyString(), any(UserRegisteredEvent.class)))
                .thenReturn(null);
        when(userRegisteredKafkaTemplate.send(anyString(), anyString(), any(UserRegisteredEvent.class)))
                .thenReturn(null);

        when(genericKafkaTemplate.send(anyString(), any()))
                .thenReturn(null);
        when(genericKafkaTemplate.send(anyString(), anyString(), any()))
                .thenReturn(null);

        userService = new UserService(
                userRepository,
                userMapper,
                passwordEncoder,
                teamMemberRepository,
                userRegisteredKafkaTemplate,
                genericKafkaTemplate
        );
    }

    private UserDTO sampleUserDTO() {
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

    private User sampleUser() {
        User user = new User();
        user.setId(1L);
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setEmail("john@example.com");
        user.setPhoneNumber("0600000000");
        user.setPassword("encoded");
        user.setRole(Role.EMPLOYEE);
        user.setActive(false);
        user.setCreatedAt(LocalDateTime.now());
        return user;
    }

    @Test
    @DisplayName("Should create user successfully")
    void shouldCreateUser() {
        UserDTO dto = sampleUserDTO();

        when(userRepository.existsByEmail(dto.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });

        UserDTO result = userService.create(dto);

        assertNotNull(result.getId());
        assertEquals("John", result.getFirstName());
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("Should reject duplicate email")
    void shouldRejectDuplicateEmail() {
        when(userRepository.existsByEmail(anyString())).thenReturn(true);
        assertThrows(ConflictException.class, () -> userService.create(sampleUserDTO()));
    }

    @Test
    @DisplayName("Should reject missing password")
    void shouldRejectMissingPassword() {
        UserDTO dto = sampleUserDTO();
        dto.setPassword(null);
        assertThrows(ConflictException.class, () -> userService.create(dto));
    }

    @Test
    @DisplayName("Should get user by id")
    void shouldGetUser() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(sampleUser()));

        UserDTO result = userService.get(1L);

        assertEquals("John", result.getFirstName());
        verify(userRepository).findById(1L);
    }

    @Test
    @DisplayName("Should throw when user not found")
    void shouldThrowWhenNotFound() {
        when(userRepository.findById(anyLong())).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> userService.get(1L));
    }

    @Test
    @DisplayName("Should approve user")
    void shouldApproveUser() {
        User user = sampleUser();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        userService.approveUser(1L);

        assertTrue(user.isActive());
        verify(userRepository).save(user);
    }
}