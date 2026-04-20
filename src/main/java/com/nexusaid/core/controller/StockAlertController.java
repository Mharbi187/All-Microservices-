package com.nexusaid.core.controller;

import com.nexusaid.core.entity.StockAlert;
import com.nexusaid.core.entity.enums.AlertSeverity;
import com.nexusaid.core.entity.enums.AlertType;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.StockAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory/alerts")
@RequiredArgsConstructor
public class StockAlertController {

    private final StockAlertService alertService;

    @GetMapping
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE', 'RESP_SECOURISME', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<List<StockAlert>> getActiveAlerts() {
        return ResponseEntity.ok(alertService.getActiveAlerts());
    }

    @GetMapping("/item/{itemId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE', 'RESP_SECOURISME', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<List<StockAlert>> getAlertsForItem(@PathVariable UUID itemId) {
        return ResponseEntity.ok(alertService.getAlertsForItem(itemId));
    }

    @PostMapping("/trigger")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE', 'RESP_SECOURISME', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<StockAlert> triggerAlert(
            @RequestParam UUID itemId,
            @RequestParam AlertType type,
            @RequestParam AlertSeverity severity) {
        return ResponseEntity.ok(alertService.createAlert(itemId, type, severity));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'RESP_SANTE', 'RESP_SECOURISME', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<StockAlert> resolveAlert(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(alertService.resolveAlert(id, userDetails.getUser().getId()));
    }
}
