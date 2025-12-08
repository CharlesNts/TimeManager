package epitech.timemanager1.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "clock_pauses", indexes = { @Index(name = "ix_pause_clock", columnList = "clock_id"),
        @Index(name = "ix_pause_start", columnList = "startAt") })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClockPause {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "clock_id", nullable = false)
    @JsonIgnore
    private Clock clock;

    @Column(nullable = false)
    private LocalDateTime startAt;

    @Column(nullable = true)
    private LocalDateTime endAt;

    @Column(length = 300)
    private String note;
}