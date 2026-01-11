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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final TeamMemberRepository teamMemberRepository;

    /** OPTIONAL Kafka beans (NOT created in tests) */
    @Autowired(required = false)
    private KafkaTemplate<String, UserRegisteredEvent> kafkaTemplate;

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate2;

    @Value("${app.kafka.enabled:true}")
    private boolean kafkaEnabled;

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
        user.setActive(false);

        User savedUser = userRepository.save(user);

        if (kafkaEnabled && kafkaTemplate != null) {
            kafkaTemplate.send(
                    KafkaTopics.USER_REGISTERED,
                    "user-" + savedUser.getId(),
                    new UserRegisteredEvent(
                            savedUser.getId(),
                            savedUser.getEmail(),
                            savedUser.getFirstName(),
                            LocalDateTime.now()
                    )
            );
        }

        return userMapper.toDTO(savedUser);
    }

    @Transactional(readOnly = true)
    public UserDTO get(Long id) {
        return userRepository.findById(id)
                .map(userMapper::toDTO)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @Transactional(readOnly = true)
    public UserDTO getByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(userMapper::toDTO)
                .orElseThrow(() -> new NotFoundException("User not found with email " + email));
    }

    @Transactional(readOnly = true)
    public List<UserDTO> list() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }

    public UserDTO update(Long id, UserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setPhoneNumber(dto.getPhoneNumber());
        user.setRole(dto.getRole());

        return userMapper.toDTO(userRepository.save(user));
    }

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

        if (kafkaEnabled && kafkaTemplate2 != null) {
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
    }

    public void rejectUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.setActive(false);
        userRepository.save(user);

        if (kafkaEnabled && kafkaTemplate2 != null) {
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
    }

    @Transactional(readOnly = true)
    public List<UserDTO> findAllPending() {
        return userRepository.findAll()
                .stream()
                .filter(u -> !u.isActive())
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }
}