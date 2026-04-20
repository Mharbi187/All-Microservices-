package com.nexusaid.core.entity.domains.jeunesse;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "youth_domain_options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YouthDomainOption {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "option_type", nullable = false)
    private String type; // CATEGORY, PRIORITY, TARGET, STATUS

    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "value", nullable = false)
    private String value;

    @Column(name = "color")
    private String color; // Hex code for UI representation
}
