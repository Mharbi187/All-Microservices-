package com.nexusaid.core.service;

import com.nexusaid.core.entity.StockAlert;
import com.nexusaid.core.entity.enums.AlertSeverity;
import com.nexusaid.core.entity.enums.AlertType;
import com.nexusaid.core.repository.StockAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StockAlertService {

    private final StockAlertRepository alertRepository;

    public List<StockAlert> getActiveAlerts() {
        return alertRepository.findByResolvedAtIsNull();
    }

    public List<StockAlert> getAlertsForItem(UUID itemId) {
        return alertRepository.findByItemId(itemId);
    }

    @Transactional
    public StockAlert createAlert(UUID itemId, AlertType type, AlertSeverity severity) {
        StockAlert alert = StockAlert.builder()
                .itemId(itemId)
                .alertType(type)
                .severity(severity)
                .build();
        return alertRepository.save(alert);
    }

    @Transactional
    public StockAlert resolveAlert(UUID alertId, UUID resolvedBy) {
        StockAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        if (alert.getResolvedAt() != null) {
            throw new RuntimeException("Alert is already resolved");
        }

        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolvedBy(resolvedBy);
        return alertRepository.save(alert);
    }
}
