package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "storage_locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorageLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // ENTREPOT, PHARMACIE, BUREAU, AUTRE

    @Column(name = "acquisition_type", nullable = false)
    private String acquisitionType; // LOUE, ACHETE, DON, AUTRE

    private String address;

    @Column(name = "gps_latitude")
    private Double gpsLatitude;

    @Column(name = "gps_longitude")
    private Double gpsLongitude;

    @Column(name = "photo", columnDefinition = "TEXT")
    private String photo; // Base64

    private Double capacity; // m3

    @Column(name = "committee_id", nullable = false)
    private UUID committeeId;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE, INACTIVE
}
