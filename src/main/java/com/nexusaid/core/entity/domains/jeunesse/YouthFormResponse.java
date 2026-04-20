package com.nexusaid.core.entity.domains.jeunesse;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "youth_form_responses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YouthFormResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "id_form_template", nullable = false)
    private UUID idFormTemplate;

    @Column(name = "id_volunteer", nullable = false)
    private UUID idVolunteer;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String responses; // Store JSON string of user answers

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @PrePersist
    protected void onCreate() {
        submittedAt = LocalDateTime.now();
    }
}
