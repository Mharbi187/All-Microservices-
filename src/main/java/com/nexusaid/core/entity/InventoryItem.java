package com.nexusaid.core.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.nexusaid.core.entity.enums.StockCategory;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockCategory category;

    @Column(name = "current_quantity", nullable = false)
    private Integer currentQuantity = 0;

    @Column(name = "min_threshold", nullable = false)
    private Integer minThreshold = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "committee_id", nullable = false)
    @JsonIgnore
    private Committee committee;

    @Column(name = "storage_location_id")
    private UUID storageLocationId;
}
