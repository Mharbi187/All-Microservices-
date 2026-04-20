package com.nexusaid.core.entity.domains.jeunesse;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "youth_form_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YouthFormTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String questions; // JSON string of the form questions structure

    @Column(name = "target_level")
    private String targetLevel; // GLOBAL, REGIONAL, LOCAL

    @Column(name = "committee_id")
    private String committeeId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
