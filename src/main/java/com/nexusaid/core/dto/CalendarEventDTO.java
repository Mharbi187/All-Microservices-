package com.nexusaid.core.dto;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CalendarEventDTO {
    private UUID id;
    private String title;
    private String description;
    private String type;
    private OffsetDateTime startDate;
    private OffsetDateTime endDate;
    private String location;
    private String organizerName;
    private UUID committeeId;
    private String committeeName;
    private Integer maxParticipants;
    private int registeredCount;
    private boolean isRegistered;
    /** Portée hiérarchique : LOCAL | REGIONAL | NATIONAL */
    private String targetScope;
    /** Statut : EN_ATTENTE | VALIDE | REJETE | ANNULE */
    private String status;
}
