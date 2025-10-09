package epitech.timemanager1.services;

import epitech.timemanager1.dto.UserDTO;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class UserService {

    private final UserRepository users;

    // ----- mapping helpers (replace later with MapStruct if you want) -----
    private User toEntity(UserDTO d) {
        if (d == null) return null;
        return User.builder()
                .id(d.getId())
                .firstName(d.getFirstName())
                .lastName(d.getLastName())
                .email(d.getEmail())
                .phoneNumber(d.getPhoneNumber())
                .role(d.getRole() != null ? d.getRole() : User.builder().build().getRole()) // default EMPLOYEE from entity
                .password(d.getPassword()) // required on create due to @NotBlank on entity
                .createdAt(d.getCreatedAt())
                .build();
    }

    private UserDTO toDTO(User e) {
        if (e == null) return null;
        return UserDTO.builder()
                .id(e.getId())
                .firstName(e.getFirstName())
                .lastName(e.getLastName())
                .email(e.getEmail())
                .phoneNumber(e.getPhoneNumber())
                .role(e.getRole())
                .createdAt(e.getCreatedAt())
                // password intentionally omitted (write-only)
                .build();
    }
    // ---------------------------------------------------------------------

    public UserDTO create(@Valid UserDTO dto) {
        if (users.existsByEmail(dto.getEmail())) {
            throw new ConflictException("Email already in use: " + dto.getEmail());
        }
        User toSave = toEntity(dto);     // convert DTO -> Entity
        User saved  = users.save(toSave);
        return toDTO(saved);             // return DTO
    }

    @Transactional(readOnly = true)
    public UserDTO get(long id) {
        return users.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<UserDTO> list() {
        return users.findAll().stream().map(this::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public Page<UserDTO> searchByName(String q, Pageable pageable) {
        String s = q == null ? "" : q;
        return users.findByLastNameContainingIgnoreCaseOrFirstNameContainingIgnoreCase(s, s, pageable)
                .map(this::toDTO);
    }

    public UserDTO update(long id, @Valid UserDTO patch) {
        User u = users.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));

        if (patch.getFirstName() != null)   u.setFirstName(patch.getFirstName());
        if (patch.getLastName() != null)    u.setLastName(patch.getLastName());
        if (patch.getPhoneNumber() != null) u.setPhoneNumber(patch.getPhoneNumber());
        if (patch.getRole() != null)        u.setRole(patch.getRole());

        if (patch.getEmail() != null && !patch.getEmail().equals(u.getEmail())) {
            if (users.existsByEmail(patch.getEmail()))
                throw new ConflictException("Email already in use: " + patch.getEmail());
            u.setEmail(patch.getEmail());
        }

        if (patch.getPassword() != null && !patch.getPassword().isBlank()) {
            u.setPassword(patch.getPassword()); // assume already hashed for now
        }

        return toDTO(u); // managed entity; changes will flush; return DTO
    }

    public void delete(long id) {
        if (!users.existsById(id)) throw new NotFoundException("User not found: " + id);
        users.deleteById(id);
    }
}