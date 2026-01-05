package epitech.timemanager1.services;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.events.UserApprovedEvent;
import epitech.timemanager1.events.UserRegisteredEvent;
import epitech.timemanager1.events.UserRejectedEvent;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.kafka.KafkaTopics;
import epitech.timemanager1.mapper.UserMapper;
import epitech.timemanager1.repositories.TeamMemberRepository;
import epitech.timemanager1.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service responsible for managing {@link User} entities and handling
 * user-related operations such as creation, retrieval, updating, deletion,
 * and approval workflows.
 * <p>
 * The service also encodes passwords, prevents duplicate email registration,
 * and enforces CEO approval before activating new users.
 * </p>
 */
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final TeamMemberRepository teamMemberRepository;
    private final KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate2;

    /**
     * Creates a new user based on the provided DTO.
     * <p>
     * Validates that a password is provided and that the email is not already used.
     * Passwords are stored as encoded hashes.
     * Newly created users are inactive by default until CEO approval.
     * </p>
     *
     * @param dto the {@link UserDTO} containing user information
     * @return the created {@link UserDTO}
     * @throws ConflictException if the password is missing or email is already in use
     */
    @Transactional
    public UserDTO create(UserDTO dto) {
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new ConflictException("Password is required for user creation");
        }

        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new ConflictException("Email already in use");
        }

        User user = userMapper.toEntity(dto);
        user.setCreatedAt(LocalDateTime.now());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setActive(false); // CEO approval required

        User savedUser = userRepository.save(user);
        kafkaTemplate.send(
                KafkaTopics.USER_REGISTERED,
                "user-" + savedUser.getId(), // key (ordering per user)
                new UserRegisteredEvent(
                        savedUser.getId(),
                        savedUser.getEmail(),
                        savedUser.getFirstName(),
                        LocalDateTime.now()
                )
        );

        return userMapper.toDTO(savedUser);
    }

    /**
     * Retrieves a user by ID.
     *
     * @param id the user's ID
     * @return the corresponding {@link UserDTO}
     * @throws NotFoundException if the user does not exist
     */
    @Transactional(readOnly = true)
    public UserDTO get(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return userMapper.toDTO(user);
    }

    /**
     * Retrieves a user by email address.
     *
     * @param email the user's email
     * @return the corresponding {@link UserDTO}
     * @throws NotFoundException if no user exists with the given email
     */
    @Transactional(readOnly = true)
    public UserDTO getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found with email " + email));
        return userMapper.toDTO(user);
    }

    /**
     * Retrieves all users in the system.
     *
     * @return a list of all {@link UserDTO} objects
     */
    @Transactional(readOnly = true)
    public List<UserDTO> list() {
        return userRepository.findAll().stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing user's basic details such as name, phone number, and role.
     *
     * @param id  the user's ID
     * @param dto the {@link UserDTO} containing updated information
     * @return the updated {@link UserDTO}
     * @throws NotFoundException if the user does not exist
     */
    public UserDTO update(Long id, UserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setPhoneNumber(dto.getPhoneNumber());
        user.setRole(dto.getRole());

        return userMapper.toDTO(userRepository.save(user));
    }

    /**
     * Deletes a user by ID.
     *
     * @param id the user's ID
     * @throws NotFoundException if the user does not exist
     */
    public void delete(Long id) {
        if (!userRepository.existsById(id)) {
            throw new NotFoundException("User not found");
        }
        if (teamMemberRepository.existsByUserId(id)) {
            throw new ConflictException("User is member of at least one team and cannot be deleted");
        }
        userRepository.deleteById(id);
    }

    public void approveUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.setActive(true);
        userRepository.save(user);

        kafkaTemplate2.send(
                KafkaTopics.USER_APPROVED,
                new UserApprovedEvent(
                        user.getId(),
                        user.getEmail(),
                        user.getFirstName(),
                        LocalDateTime.now()
                )
        );
    }

    /**
     * Rejects a user (deactivates their account).
     *
     * @param id the user's ID
     * @throws NotFoundException if the user does not exist
     */
    public void rejectUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.setActive(false);
        userRepository.save(user);

        kafkaTemplate2.send(
                KafkaTopics.USER_REJECTED,
                new UserRejectedEvent(
                        user.getId(),
                        user.getEmail(),
                        user.getFirstName(),
                        "Account rejected by admin",
                        LocalDateTime.now()
                )
        );
    }

    /**
     * Retrieves all users who are pending approval (inactive accounts).
     *
     * @return a list of {@link UserDTO} representing inactive users
     */
    @Transactional(readOnly = true)
    public List<UserDTO> findAllPending() {
        return userRepository.findAll().stream()
                .filter(u -> !u.isActive())
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }
}