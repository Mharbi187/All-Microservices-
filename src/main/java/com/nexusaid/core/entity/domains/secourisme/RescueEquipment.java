package com.nexusaid.core.entity.domains.secourisme;

import com.nexusaid.core.entity.Committee;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.util.List;
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
    private String type; // e.g., Defibrillator, Oxygen Tank, First Aid Kit

    @Column(name = "serial_number")
    private String serialNumber;

    @Column(name = "last_maintenance_date")
    private LocalDate lastMaintenanceDate;

    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;

    @Column(nullable = false)
    private String condition; // e.g., Good, Needs Maintenance, Out of Service

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    private Committee assignedToCommittee;
}
