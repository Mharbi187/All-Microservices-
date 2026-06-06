package com.nexusaid.core.entity;

import com.nexusaid.core.entity.enums.ComplaintStatus;
import com.nexusaid.core.entity.enums.ComplaintVisibility;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submitter_id")
    private User submitter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_committee_id", nullable = false)
    private Committee targetCommittee;

    @Column(length = 255, nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ComplaintVisibility visibility;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ComplaintStatus status;

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ComplaintAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "complaint", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ComplaintResponse> responses = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Tracks the last status for which the submitter was notified via email+in-app.
     * Logic: send notification only once per (complaint, status) pair.
     * Statuses: EN_ATTENTE → EN_COURS → RESOLU (REJETE also triggers notification).
     */
    @Column(name = "last_notified_status", length = 20)
    private String lastNotifiedStatus;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ComplaintStatus.EN_ATTENTE;
        }
        if (this.visibility == null) {
            this.visibility = ComplaintVisibility.VISIBLE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
