package com.nexusaid.core.entity.domains.diffusion;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.enums.CommitteeType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quizzes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Quiz {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String category;

    private Integer minScore;
    private Integer timeLimit;

    private String badgeTitle;
    private String badgeColor;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_scope", nullable = false)
    @Builder.Default
    private CommitteeType targetScope = CommitteeType.LOCAL;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "DRAFT";

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id")
    private Committee committee;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @EqualsAndHashCode.Exclude
    private List<QuizQuestion> questions = new ArrayList<>();
}
