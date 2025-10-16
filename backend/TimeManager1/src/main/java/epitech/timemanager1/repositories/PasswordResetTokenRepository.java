package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.PasswordResetToken;
import epitech.timemanager1.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);
    Optional<PasswordResetToken> findTopByUserOrderByCreatedAtDesc(User user);
    void deleteByUserId(Long userId);
}