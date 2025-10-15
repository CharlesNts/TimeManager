package epitech.timemanager1.repositories;

import epitech.timemanager1.entities.ScheduleOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleOverrideRepository extends JpaRepository<ScheduleOverride, Long> {
    List<ScheduleOverride> findByEmployeeIdAndDateBetweenOrderByDateAsc(Long employeeId,
                                                                        LocalDate from,
                                                                        LocalDate to);
}