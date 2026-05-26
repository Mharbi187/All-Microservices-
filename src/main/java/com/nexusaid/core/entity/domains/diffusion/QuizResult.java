package com.nexusaid.core.entity.domains.diffusion;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.Volunteer;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz_results")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizResult {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "volunteer_id", nullable = false)
    private Volunteer volunteer;

    private Integer score;
    private Boolean passed;

    private String badgeEarned;
    private String badgeColor;

    private Integer timeTaken;

    @CreationTimestamp
    private OffsetDateTime submittedAt;

    @ElementCollection
    @CollectionTable(name = "quiz_result_answers", joinColumns = @JoinColumn(name = "result_id"))
    @Builder.Default
    private List<QuizResultAnswer> answers = new ArrayList<>();
}
