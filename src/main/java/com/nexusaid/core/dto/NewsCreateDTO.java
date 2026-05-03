package com.nexusaid.core.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class NewsCreateDTO {
    private String title;
    private String summary;
    private String content;
    private String category;
    private String imageUrl;
    private UUID committeeId;
    /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL (CommitteeType) */
    private String targetScope = "LOCAL";
}
