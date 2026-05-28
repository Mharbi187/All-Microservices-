package com.nexusaid.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, length = 10)
    private String type; // IN or OUT

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    @JsonIgnore
    private InventoryItem inventoryItem;

    @Column(name = "recorded_by")
    private UUID recordedBy;

    @Column(length = 20)
    private String status = "APPROVED"; // PENDING, APPROVED, REJECTED

    @Column(name = "proof_photo", columnDefinition = "TEXT")
    private String proofPhoto;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_by_name")
    private String approvedByName;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "recorded_by_name")
    private String recordedByName;

    @Column(name = "item_condition")
    private String itemCondition; // NEUF, BON_ETAT, USÉ, ENDOMMAGÉ

    private String supplier; // For IN movements (Donateur, Fournisseur)

    @Column(name = "received_by")
    private String receivedBy; // For IN movements
}
