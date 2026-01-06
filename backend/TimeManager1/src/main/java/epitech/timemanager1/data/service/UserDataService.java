package epitech.timemanager1.data.service;

import epitech.timemanager1.data.dto.UserDataDTO;
import epitech.timemanager1.entities.User;
import epitech.timemanager1.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserDataService {

    private final UserRepository userRepository;

    public List<UserDataDTO> findAll() {
        return userRepository.findAll()
                .stream()
                .map(this::toDataDTO)
                .toList();
    }

    private UserDataDTO toDataDTO(User user) {
        return new UserDataDTO(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.isActive(),
                user.getCreatedAt()
        );
    }
}