package com.nexusaid.core.entity.domains.vff;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "vff_partners")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Partner {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String type; // police, hospital, center, protection, association

    @Column(nullable = false)
    private String label;

    private String region;

    private String phone;

    private String address;

    private double latitude;

    private double longitude;
}
