// src/main/java/epitech/timemanager1/entities/ScheduleTemplate.java
package epitech.timemanager1.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity
@Table(name = "schedule_templates",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_template_team_name", columnNames = {"team_id", "name"})
       },
       indexes = {
           @Index(name = "ix_template_team", columnList = "team_id")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ScheduleTemplate {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String name;

    // Keep it simple for now: active = the template to apply when generating shifts.
    @Column(nullable = false)
    private boolean active;

    // Optional free-form pattern (JSON) if you want to evolve later without DB migrations.
    // e.g. { "mon":[["09:00","17:00"]], "tue":[["09:00","17:00"]] ... }
    @Lob
    private String weeklyPatternJson;
}