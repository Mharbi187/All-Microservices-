package com.nexusaid.core.entity.domains.diffusion;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "educational_resources")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EducationalResource {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category; // e.g., DIH, Fundamental Principles

    @Column(name = "content_type", nullable = false)
    private String contentType; // e.g., PDF, VIDEO, ARTICLE

    @Column(name = "file_url")
    private String fileUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String topic;

    private String language;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy; // refers to the RESP_DIFFUSION volunteer ID

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
