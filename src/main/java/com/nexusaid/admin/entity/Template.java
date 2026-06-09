package com.nexusaid.admin.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexusaid.admin.entity.enums.TemplateScope;
import com.nexusaid.admin.entity.enums.VisibilityScope;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Template {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy; // ID of the user (e.g., Secrétaire Général)

    @Column(name = "creator_role", nullable = false, length = 100)
    private String creatorRole;

    @Column(name = "creator_committee_id", nullable = false)
    private UUID creatorCommitteeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility_scope", nullable = false, length = 50)
    private VisibilityScope visibilityScope;

    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // ── v2: JSONB-based scope & inheritance ────────────────────────────

    /** Hierarchy scope for access control enforcement */
    @Enumerated(EnumType.STRING)
    @Column(name = "scope", length = 20)
    private TemplateScope scope;

    /** True = this is a root/base template, not derived from another */
    @Column(name = "is_base_template", nullable = false)
    @Builder.Default
    private Boolean isBaseTemplate = false;

    /** Parent template from which this one inherits default blocks */
    @Column(name = "parent_template_id")
    private UUID parentTemplateId;

    /** JSONB rules controlling which committees are assigned this template */
    @Type(JsonBinaryType.class)
    @Column(name = "assignment_rules", columnDefinition = "jsonb")
    private JsonNode assignmentRules;

    // ── Legacy blocks relationship (backward compat) ───────────────────
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("positionOrder ASC")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<TemplateBlock> blocks = new ArrayList<>();

    // ── Template versions (v2 structure) ──────────────────────────────
    @OneToMany(mappedBy = "template", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("versionNumber ASC")
    @Builder.Default
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<TemplateVersion> versions = new ArrayList<>();

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void addBlock(TemplateBlock block) {
        blocks.add(block);
        block.setTemplate(this);
    }

    public void removeBlock(TemplateBlock block) {
        blocks.remove(block);
        block.setTemplate(null);
    }
}
