package com.nexusaid.admin.entity;

import com.nexusaid.admin.entity.enums.DonationCategory;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "donation_needs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationNeed {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID committeeId; // References MS1

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DonationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NeedsStatus status;

    private BigDecimal targetAmount;
    private Integer targetQuantity;

    private BigDecimal currentAmount;
    private Integer currentQuantity;

    @Column(nullable = false)
    private UUID createdByRole; // Role UUID or Identifier if needed, or user UUID
    private String creatorRoleName;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
