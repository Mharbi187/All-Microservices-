package com.nexusaid.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "monetary_donations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonetaryDonation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID donorId; // Reference to MS1 user if registered, or null if anonymous (but CDC says
                          // registered donors usually)

    private String donorName; // Denormalized or for anonymous walk-ins
    private String donorCin;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "need_id")
    private DonationNeed need;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "TND";

    private String paymentMethod; // e.g. CASH, CHEQUE, TRANSFER

    @Column(unique = true, nullable = false)
    private String receiptNumber;

    @Column(nullable = false)
    private LocalDate receiptDate;

    @Column(columnDefinition = "TEXT")
    private String qrCodeData;

    @Column(nullable = false)
    private UUID receivedBy; // The Volunteer who processed it

    @CreationTimestamp
    private LocalDateTime createdAt;
}
