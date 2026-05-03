package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Catalogue des certifications secourisme — configurable dynamiquement depuis la DB.
 * Modifiable par RESP_SECOURISME, RESP_JEUNESSE (national), PRESIDENT (national).
 */
@Entity
@Table(name = "secourisme_certifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecourismeCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false)
    private String label;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private int level = 1;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /**
     * JSON array of role strings that can edit this certification.
     * Example: ["RESP_SECOURISME", "RESP_JEUNESSE", "PRESIDENT"]
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "editable_by", columnDefinition = "jsonb")
    private String editableBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
