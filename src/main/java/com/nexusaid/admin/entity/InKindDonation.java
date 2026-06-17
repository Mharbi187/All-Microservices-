package com.nexusaid.admin.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "in_kind_donations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InKindDonation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID donorId;

    private String donorName;
    private String donorCin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_id")
    private DonationNeed need;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String itemsDescription; // e.g. [{"item": "Blankets", "qty": 50}]

    @Column(nullable = false)
    private LocalDate receiptDate;

    @Column(unique = true, nullable = false)
    private String receiptNumber; // CDC: Receipts are generated for in-kind too

    @Column(columnDefinition = "TEXT")
    private String qrCodeData;

    @Column(nullable = false)
    private UUID receivedBy; // The Volunteer who processed the intake

    @CreationTimestamp
    private LocalDateTime createdAt;
}
