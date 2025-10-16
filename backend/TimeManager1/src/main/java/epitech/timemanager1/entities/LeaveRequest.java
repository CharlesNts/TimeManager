package epitech.timemanager1.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;

@Entity
@Table(name = "leave_requests",
        indexes = {
                @Index(name = "ix_leave_employee", columnList = "employee_id"),
                @Index(name = "ix_leave_start", columnList = "start_at") // matches DB
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EntityListeners(AuditingEntityListener.class)
public class LeaveRequest {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private LeaveType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private LeaveStatus status;

    @Column(length = 500)
    private String reason;

    // ---- Primary fields your code uses ----
    @Column(name = "start_at", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_at", nullable = false)
    private LocalDate endDate;

    // ---- Compatibility fields for legacy NOT NULL columns ----
    // Kept in sync before persist/update so DB constraints pass.
    @JsonIgnore
    @Setter(AccessLevel.NONE)
    @Column(name = "start_date", nullable = false)
    private LocalDate _startDateCompat;

    @JsonIgnore
    @Setter(AccessLevel.NONE)
    @Column(name = "end_date", nullable = false)
    private LocalDate _endDateCompat;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private java.time.LocalDateTime createdAt;

    @PrePersist
    @PreUpdate
    private void syncCompatColumns() {
        this._startDateCompat = this.startDate;
        this._endDateCompat   = this.endDate;
    }
}