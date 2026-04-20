package com.nexusaid.core.entity;

import com.nexusaid.core.entity.enums.AlertSeverity;
import com.nexusaid.core.entity.enums.AlertType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "stock_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "item_id")
    private UUID itemId;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", length = 50)
    private AlertType alertType;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AlertSeverity severity;

    @Column(name = "triggered_at", updatable = false)
    private LocalDateTime triggeredAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @PrePersist
    protected void onCreate() {
        this.triggeredAt = LocalDateTime.now();
    }
}
