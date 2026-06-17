package com.nexusaid.core.entity.domains.secourisme;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.Committee;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "rescue_equipment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescueEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "status")
    private String status;

    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;

    @Column
    private String condition; // e.g., Good, Needs Maintenance, Out of Service

    @Column(name = "last_inspection_date")
    private LocalDate lastInspectionDate;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee assignedToCommittee;

    @PrePersist
    public void prePersist() {
        if (this.condition == null) {
            this.condition = "Good";
        }
    }
}
