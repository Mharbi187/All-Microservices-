package com.nexusaid.core.repository;

import com.nexusaid.core.entity.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockAlertRepository extends JpaRepository<StockAlert, UUID> {
    List<StockAlert> findByResolvedAtIsNull();
    List<StockAlert> findByItemId(UUID itemId);
}
