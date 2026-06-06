package com.nexusaid.core.entity.domains.catastrophe;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "disaster_team_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisasterTeamMember {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @Column(name = "volunteer_id", nullable = false)
    private UUID volunteerId;

    // e.g. NDRT, RDRT, LDRT
    @Column(name = "team_type", nullable = false)
    private String teamType;

    // ACTIVE, SUSPENDED
    @Column(nullable = false)
    private String status;

    private String specialty;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @PrePersist
    public void prePersist() {
        if (joinedAt == null) joinedAt = LocalDateTime.now();
        if (status == null) status = "ACTIVE";
    }
}
