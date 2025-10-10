package epitech.timemanager1.services;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.Role;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.mapper.UserMapper;
import epitech.timemanager1.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
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
        user.setActive(false); // CEO must approve new users

        return userMapper.toDTO(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserDTO get(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return userMapper.toDTO(user);
    }

    @Transactional(readOnly = true)
    public UserDTO getByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found with email " + email));
        return userMapper.toDTO(user);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> list() {
        return userRepository.findAll().stream()
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
        userRepository.deleteById(id);
    }


    public void approveUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setActive(true);
        userRepository.save(user);
    }

    public void rejectUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setActive(false);
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> findAllPending() {
        return userRepository.findAll().stream()
                .filter(u -> !u.isActive())
                .map(userMapper::toDTO)
                .collect(Collectors.toList());
    }
}