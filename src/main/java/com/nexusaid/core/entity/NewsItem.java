package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.GenericGenerator;
import com.nexusaid.core.entity.enums.CommitteeType;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.Set;
import java.util.HashSet;

@Entity
@Table(name = "news_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewsItem {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false)
    private String category; // 'NATIONAL', 'COMMITTEE', 'FORMATION', 'EVENT', 'URGENCE'

    private String imageUrl;

    /**
     * Portée hiérarchique de l'actualité :
     * LOCAL  → visible uniquement par le comité qui l'a créée
     * REGIONAL → visible par tous les comités locaux du même gouvernorat
     * NATIONAL → visible par tous
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "target_scope", nullable = false)
    @Builder.Default
    private CommitteeType targetScope = CommitteeType.LOCAL;

    /**
     * Statut de validation :
     * EN_ATTENTE → soumis, attend validation du Président
     * PUBLIE     → validé et visible
     * REJETE     → refusé par le Président
     */
    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "EN_ATTENTE";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id")
    private Committee committee;

    @Builder.Default
    private OffsetDateTime publishedAt = OffsetDateTime.now();

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "news_likes",
        joinColumns = @JoinColumn(name = "news_id"),
        inverseJoinColumns = @JoinColumn(name = "volunteer_id")
    )
    @Builder.Default
    @EqualsAndHashCode.Exclude
    private Set<Volunteer> likers = new HashSet<>();
}
