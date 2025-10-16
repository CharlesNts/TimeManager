package epitech.timemanager1.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "schedule_overrides",
        indexes = {
                @Index(name = "ix_override_employee", columnList = "employee_id"),
                @Index(name = "ix_override_date", columnList = "date")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduleOverride {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @NotNull
    @Column(nullable = false)
    private LocalDate date;

    @NotNull
    @Size(max = 50)
    @Column(nullable = false, length = 50)
    private String field;

    @NotNull
    @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String value;

    @Size(max = 300)
    private String reason;
}