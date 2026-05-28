package com.nexusaid.core.dto;

import com.nexusaid.core.entity.enums.StockCategory;
import lombok.Data;

import java.util.List;
import java.util.UUID;

public class InventoryDtos {

    @Data
    public static class CreateItemRequest {
        private String name;
        private StockCategory category;
        private Integer initialQuantity;
        private Integer minThreshold;
        private UUID committeeId;
        private UUID storageLocationId;
    }

    @Data
    public static class RecordMovementRequest {
        private Integer quantity;
        private String reason;
        private String proofPhoto;
        private String recordedByName;
        private String itemCondition;
        private String supplier;
        private String receivedBy;
    }

    @Data
    public static class BulkEntryRequest {
        private String recordedByName;
        private String receivedBy;
        private String supplier;
        private String proofPhoto;
        private List<BulkEntryItem> entries;
    }

    @Data
    public static class BulkEntryItem {
        private UUID itemId;
        private Integer quantity;
        private String reason;
    }
}
