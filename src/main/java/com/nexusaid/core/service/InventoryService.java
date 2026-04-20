package com.nexusaid.core.service;

import com.nexusaid.core.dto.InventoryDtos.CreateItemRequest;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.InventoryItem;
import com.nexusaid.core.entity.StockMovement;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.InventoryItemRepository;
import com.nexusaid.core.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CommitteeRepository committeeRepository;

    public List<InventoryItem> getInventoryForCommittee(UUID committeeId) {
        return inventoryItemRepository.findByCommitteeId(committeeId);
    }

    @Transactional
    public InventoryItem createItem(CreateItemRequest request, UUID creatorId) {
        Committee committee = committeeRepository.findById(request.getCommitteeId())
                .orElseThrow(() -> new IllegalArgumentException("Committee not found"));

        InventoryItem item = new InventoryItem();
        item.setName(request.getName());
        item.setCategory(request.getCategory());
        item.setMinThreshold(request.getMinThreshold());
        item.setCurrentQuantity(0); // initial is 0, we log a movement if initialQuantity > 0
        item.setCommittee(committee);

        inventoryItemRepository.save(item);

        if (request.getInitialQuantity() != null && request.getInitialQuantity() > 0) {
            recordMovement(item.getId(), request.getInitialQuantity(), "IN", "Initial Stock", creatorId);
        }

        return item;
    }

    @Transactional
    public StockMovement recordMovement(UUID itemId, Integer quantity, String type, String reason, UUID recordedBy) {
        InventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Item not found"));

        if ("OUT".equalsIgnoreCase(type)) {
            if (item.getCurrentQuantity() < quantity) {
                throw new IllegalArgumentException("Insufficient stock to fulfill this OUT movement");
            }
            item.setCurrentQuantity(item.getCurrentQuantity() - quantity);
        } else if ("IN".equalsIgnoreCase(type)) {
            item.setCurrentQuantity(item.getCurrentQuantity() + quantity);
        } else {
            throw new IllegalArgumentException("Movement type must be IN or OUT");
        }

        inventoryItemRepository.save(item);

        StockMovement movement = new StockMovement();
        movement.setInventoryItem(item);
        movement.setQuantity(quantity);
        movement.setType(type.toUpperCase());
        movement.setReason(reason);
        movement.setTimestamp(LocalDateTime.now());
        movement.setRecordedBy(recordedBy);

        return stockMovementRepository.save(movement);
    }

    public List<StockMovement> getMovements(UUID itemId) {
        return stockMovementRepository.findByInventoryItemIdOrderByTimestampDesc(itemId);
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        InventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Item not found"));
        // Delete related movements first
        List<StockMovement> movements = stockMovementRepository.findByInventoryItemIdOrderByTimestampDesc(itemId);
        stockMovementRepository.deleteAll(movements);
        inventoryItemRepository.delete(item);
    }

    @Transactional
    public InventoryItem updateItem(UUID itemId, CreateItemRequest request) {
        InventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Item not found"));
        item.setName(request.getName());
        item.setCategory(request.getCategory());
        item.setMinThreshold(request.getMinThreshold());
        return inventoryItemRepository.save(item);
    }
}
