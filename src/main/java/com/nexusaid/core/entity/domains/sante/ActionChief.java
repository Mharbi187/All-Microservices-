package com.nexusaid.core.entity.domains.sante;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "action_chiefs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActionChief {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "volunteer_id", nullable = false)
    private UUID volunteerId;

    @Column(name = "health_action_id", nullable = false)
    private UUID healthActionId;

    @Column(name = "designated_at")
    private LocalDateTime designatedAt;

    @Column(name = "designated_by", nullable = false)
    private UUID designatedBy; // The RESP_SANTE or PRESIDENT who assigned them

    @Column(nullable = false)
    private String status; // ACTIVE, COMPLETED, REPLACED

    @PrePersist
    protected void onCreate() {
        designatedAt = LocalDateTime.now();
    }
}
