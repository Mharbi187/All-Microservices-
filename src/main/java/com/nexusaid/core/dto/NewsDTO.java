package com.nexusaid.core.dto;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class NewsDTO {
    private UUID id;
    private String title;
    private String summary;
    private String content;
    private String category;
    private String authorName;
    private UUID committeeId;
    private String committeeName;
    private String imageUrl;
    private OffsetDateTime publishedAt;
    private int likesCount;
    private boolean isLiked;
    /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL */
    private String targetScope;
    /** Statut : EN_ATTENTE | PUBLIE | REJETE */
    private String status;
}
