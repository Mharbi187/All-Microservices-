package com.nexusaid.core.repository;

import com.nexusaid.core.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findByInventoryItemIdOrderByTimestampDesc(UUID inventoryItemId);
}
