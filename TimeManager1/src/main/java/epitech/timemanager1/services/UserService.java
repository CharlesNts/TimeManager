package epitech.timemanager1.services;

import epitech.timemanager1.entities.User;
import epitech.timemanager1.exception.ConflictException;
import epitech.timemanager1.exception.NotFoundException;
import epitech.timemanager1.repositories.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {

    private final UserRepository users;

    public UserService(UserRepository users) {
        this.users = users;
    }

    public User create(User u) {
        if (users.existsByEmail(u.getEmail())) {
            throw new ConflictException("Email already in use: " + u.getEmail());
        }
        return users.save(u);
    }

    @Transactional(readOnly = true)
    public User get(long id) {
        return users.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<User> searchByName(String q, Pageable pageable) {
        String s = q == null ? "" : q;
        return users.findByLastNameContainingIgnoreCaseOrFirstNameContainingIgnoreCase(s, s, pageable);
    }

    public User update(long id, User patch) {
        User u = get(id);
        if (patch.getFirstName() != null) u.setFirstName(patch.getFirstName());
        if (patch.getLastName() != null)  u.setLastName(patch.getLastName());
        if (patch.getPhoneNumber() != null) u.setPhoneNumber(patch.getPhoneNumber());
        if (patch.getRole() != null) u.setRole(patch.getRole());

        if (patch.getEmail() != null && !patch.getEmail().equals(u.getEmail())) {
            if (users.existsByEmail(patch.getEmail())) throw new ConflictException("Email already in use: " + patch.getEmail());
            u.setEmail(patch.getEmail());
        }
        if (patch.getPassword() != null) u.setPassword(patch.getPassword()); // assume already hashed
        return u; // managed entity; will be flushed
    }

    public void delete(long id) {
        if (!users.existsById(id)) throw new NotFoundException("User not found: " + id);
        users.deleteById(id);
    }
}