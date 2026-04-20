package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "hierarchy_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class HierarchyAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private UUID performedBy;

    @Column(name = "target_committee_id")
    private UUID targetCommitteeId;

    @Column(name = "target_volunteer_id")
    private UUID targetVolunteerId;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
    
    @Column(columnDefinition = "text")
    private String reason;
}
