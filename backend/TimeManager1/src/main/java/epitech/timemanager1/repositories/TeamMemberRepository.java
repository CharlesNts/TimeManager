package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.TeamMember;
import epitech.timemanager1.entities.TeamMember.Id;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Id> {

    List<TeamMember> findByUserId(Long userId);

    List<TeamMember> findByTeamId(Long teamId);

    boolean existsByUserId(Long userId);

    boolean existsByUserIdAndTeamId(Long userId, Long teamId);

    void deleteByUserIdAndTeamId(Long userId, Long teamId);

    Optional<TeamMember> findByUserIdAndTeamId(Long userId, Long teamId);
}