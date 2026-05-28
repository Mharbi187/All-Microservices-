package com.nexusaid.core.repository;

import com.nexusaid.core.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findByInventoryItemIdOrderByTimestampDesc(UUID inventoryItemId);

    @Query("SELECT m FROM StockMovement m WHERE m.inventoryItem.committee.id = :committeeId AND m.status = 'PENDING' ORDER BY m.timestamp DESC")
    List<StockMovement> findPendingMovementsByCommitteeId(@Param("committeeId") UUID committeeId);

    @Query("SELECT m FROM StockMovement m WHERE m.inventoryItem.committee.id = :committeeId ORDER BY m.timestamp DESC")
    List<StockMovement> findAllMovementsByCommitteeId(@Param("committeeId") UUID committeeId);
}
