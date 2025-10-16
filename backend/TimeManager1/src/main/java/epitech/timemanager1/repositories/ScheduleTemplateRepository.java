package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.ScheduleTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleTemplateRepository extends JpaRepository<ScheduleTemplate, Long> {
    List<ScheduleTemplate> findByTeamIdOrderByNameAsc(Long teamId);
    boolean existsByTeamIdAndNameIgnoreCase(Long teamId, String name);
}