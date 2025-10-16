package epitech.timemanager1.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "clocks",
        indexes = {
                @Index(name = "ix_clocks_user", columnList = "user_id"),
                @Index(name = "ix_clocks_in", columnList = "clockIn")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Clock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @org.jetbrains.annotations.NotNull
    @Column(nullable = false)
    private LocalDateTime clockIn;

    private LocalDateTime clockOut;

    // Use List + SUBSELECT to make collection fetch-join reliable
    @OneToMany(mappedBy = "clock", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("startAt ASC")
    @Fetch(FetchMode.SUBSELECT)
    private List<ClockPause> pauses = new ArrayList<>();
}