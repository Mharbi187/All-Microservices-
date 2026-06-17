package com.nexusaid.admin.entity;

import com.nexusaid.admin.entity.enums.BlockType;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "template_blocks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TemplateBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Template template;

    @Enumerated(EnumType.STRING)
    @Column(name = "block_type", nullable = false, length = 50)
    private BlockType blockType;

    @Column(name = "position_order", nullable = false)
    private Integer positionOrder;

    // e.g. {"level": "H1"}, or {"options": ["Yes", "No"]}, or {"columns": ["A",
    // "B", "C"]}
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String config;

    @Column(name = "is_sensitive", nullable = false)
    @Builder.Default
    private Boolean isSensitive = false; // If true, AES-256 will encrypt the resulting report block data

    @Column(name = "is_required", nullable = false)
    @Builder.Default
    private Boolean isRequired = true;

    @Column(length = 255)
    private String label; // Optional helper label for UI

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
