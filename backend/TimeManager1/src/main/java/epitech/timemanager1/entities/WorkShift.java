package epitech.timemanager1.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_shifts",
        indexes = {
                @Index(name = "ix_shift_employee", columnList = "employee_id"),
                @Index(name = "ix_shift_team", columnList = "team_id"),
                @Index(name = "ix_shift_window", columnList = "startAt,endAt")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkShift {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private User employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime startAt;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime endAt;

    @Size(max = 300)
    private String note;
}