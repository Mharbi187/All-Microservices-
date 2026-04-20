package com.nexusaid.core.entity;

import com.nexusaid.core.entity.enums.ComplaintStatus;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
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

    @Column(name = "complainant_id")
    private UUID complainantId;

    @Column(name = "complainant_type", length = 50)
    private String complainantType; // e.g., "VOLUNTEER", "PARTNER"

    @Column(length = 255)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Type(JsonBinaryType.class)
    @Column(name = "photo_urls", columnDefinition = "jsonb")
    private String[] photoUrls;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private String location; // JSON of GPS coordinates

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ComplaintStatus status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ComplaintStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
