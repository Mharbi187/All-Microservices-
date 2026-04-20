package com.nexusaid.core.repository;

import com.nexusaid.core.entity.InventoryItem;
import com.nexusaid.core.entity.enums.StockCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {
    List<InventoryItem> findByCommitteeId(UUID committeeId);
    List<InventoryItem> findByCommitteeIdAndCategory(UUID committeeId, StockCategory category);
}
