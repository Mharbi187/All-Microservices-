package com.nexusaid.core.entity.domains.secourisme;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.Committee;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "rescue_devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescueDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "event_name", nullable = false)
    private String eventName;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(nullable = false)
    private String location;

    @Column(name = "required_rescuers")
    private int requiredRescuers;

    @Type(JsonBinaryType.class)
    @Column(name = "assigned_rescuers", columnDefinition = "jsonb")
    private List<UUID> assignedRescuers;

    @Type(JsonBinaryType.class)
    @Column(name = "equipment_list", columnDefinition = "jsonb")
    private List<String> equipmentList;

    @Column(nullable = false)
    private String status; // e.g., PLANNED, ACTIVE, COMPLETED, CANCELLED

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee committee;
}

