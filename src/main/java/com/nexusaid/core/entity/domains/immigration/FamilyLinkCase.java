package com.nexusaid.core.entity.domains.immigration;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "family_link_cases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyLinkCase {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "requester_id", nullable = false)
    private UUID requesterId; // Might be a MigrantCase ID or Volunteer ID handling it

    @Column(name = "requester_name", nullable = false)
    private String requesterName;

    @Column(name = "lost_family_member_name", nullable = false)
    private String lostFamilyMemberName;

    @Column(name = "last_known_location")
    private String lastKnownLocation;

    @Column(name = "conflict_context")
    private String conflictContext;

    @Column(nullable = false)
    private String status; // OPEN, INVESTIGATING, RESOLVED, CLOSED

    @Column(name = "is_confidential")
    private boolean isConfidential;

    @Column(length = 2000)
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (this.requesterName == null)
            this.requesterName = "Inconnu";
        if (this.lostFamilyMemberName == null)
            this.lostFamilyMemberName = "Inconnu";
        if (this.status == null)
            this.status = "OPEN";
    }
}
