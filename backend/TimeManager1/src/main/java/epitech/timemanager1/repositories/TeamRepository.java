package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.Team;
import epitech.timemanager1.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, Long> {

    Optional<Team> findByName(String name);

    List<Team> findByManager(User manager);

    List<Team> findByManagerId(Long managerId);
}