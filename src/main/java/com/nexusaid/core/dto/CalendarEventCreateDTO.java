package com.nexusaid.core.dto;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CalendarEventCreateDTO {
    private String title;
    private String description;
    private String type;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private String location;
    private UUID committeeId;
    private Integer maxParticipants;
    /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL (CommitteeType) */
    private String targetScope = "LOCAL";
}
