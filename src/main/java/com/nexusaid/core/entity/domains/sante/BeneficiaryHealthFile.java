package com.nexusaid.core.entity.domains.sante;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "beneficiary_health_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaryHealthFile {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "intervention_id", nullable = false)
    private UUID interventionId;

    @Column(name = "beneficiary_name", nullable = false)
    private String beneficiaryName;

    @Column(name = "intervention_type", nullable = false)
    private String interventionType; // e.g., Medical Checkup, Vaccination

    @Type(JsonBinaryType.class)
    @Column(name = "health_data", columnDefinition = "jsonb")
    private String healthData; // JSON storing blood pressure, weight, symptoms, etc.

    @Column(name = "treatment_provided", length = 1000)
    private String treatmentProvided;

    @Column(name = "referral_needed")
    private boolean referralNeeded;

    @Column(name = "referral_facility")
    private String referralFacility;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
