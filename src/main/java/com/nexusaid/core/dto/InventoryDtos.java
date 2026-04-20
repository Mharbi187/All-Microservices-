package com.nexusaid.core.dto;

import com.nexusaid.core.entity.enums.StockCategory;
import lombok.Data;

import java.util.UUID;

public class InventoryDtos {

    @Data
    public static class CreateItemRequest {
        private String name;
        private StockCategory category;
        private Integer initialQuantity;
        private Integer minThreshold;
        private UUID committeeId;
    }

    @Data
    public static class RecordMovementRequest {
        private Integer quantity;
        private String reason;
    }
}
