package com.nexusaid.core.service;

import com.nexusaid.core.dto.InventoryDtos.CreateItemRequest;
import com.nexusaid.core.dto.InventoryDtos.BulkEntryItem;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.InventoryItem;
import com.nexusaid.core.entity.StockMovement;
import com.nexusaid.core.entity.StorageLocation;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.InventoryItemRepository;
import com.nexusaid.core.repository.StockMovementRepository;
import com.nexusaid.core.repository.StorageLocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CommitteeRepository committeeRepository;
    private final StorageLocationRepository storageLocationRepository;

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
        item.setStorageLocationId(request.getStorageLocationId());

        inventoryItemRepository.save(item);

        if (request.getInitialQuantity() != null && request.getInitialQuantity() > 0) {
            recordMovement(
                item.getId(), 
                request.getInitialQuantity(), 
                "IN", 
                "Initial Stock", 
                null, 
                "Système", 
                "NEUF", 
                "Stock Initial", 
                "Système", 
                true, 
                creatorId
            );
        }

        return item;
    }

    @Transactional
    public StockMovement recordMovement(UUID itemId, Integer quantity, String type, String reason, String proofPhoto, 
                                       String recordedByName, String itemCondition, String supplier, String receivedBy,
                                       boolean isPresidentOrVp, UUID recordedBy) {
        InventoryItem item = inventoryItemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Inventory Item not found"));

        StockMovement movement = new StockMovement();
        movement.setInventoryItem(item);
        movement.setQuantity(quantity);
        movement.setType(type.toUpperCase());
        movement.setReason(reason);
        movement.setTimestamp(LocalDateTime.now());
        movement.setRecordedBy(recordedBy);
        movement.setProofPhoto(proofPhoto);
        movement.setRecordedByName(recordedByName);
        movement.setItemCondition(itemCondition);
        movement.setSupplier(supplier);
        movement.setReceivedBy(receivedBy);

        if ("OUT".equalsIgnoreCase(type)) {
            if (isPresidentOrVp) {
                if (item.getCurrentQuantity() < quantity) {
                    throw new IllegalArgumentException("Stock insuffisant pour effectuer cette sortie immédiate");
                }
                item.setCurrentQuantity(item.getCurrentQuantity() - quantity);
                inventoryItemRepository.save(item);
                movement.setStatus("APPROVED");
                movement.setApprovedBy(recordedBy);
                movement.setApprovedByName(recordedByName);
                movement.setApprovedAt(LocalDateTime.now());
            } else {
                if (item.getCurrentQuantity() < quantity) {
                    throw new IllegalArgumentException("Stock insuffisant pour demander cette sortie");
                }
                movement.setStatus("PENDING");
            }
        } else if ("IN".equalsIgnoreCase(type)) {
            item.setCurrentQuantity(item.getCurrentQuantity() + quantity);
            inventoryItemRepository.save(item);
            movement.setStatus("APPROVED");
            movement.setApprovedBy(recordedBy);
            movement.setApprovedByName(recordedByName);
            movement.setApprovedAt(LocalDateTime.now());
        } else {
            throw new IllegalArgumentException("Le type de mouvement doit être IN ou OUT");
        }

        return stockMovementRepository.save(movement);
    }

    @Transactional
    public StockMovement approveMovement(UUID movementId, UUID approverId, String approverName) {
        StockMovement movement = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new IllegalArgumentException("Mouvement introuvable"));

        if (!"PENDING".equals(movement.getStatus())) {
            throw new IllegalStateException("Ce mouvement n'est pas en attente de validation");
        }

        InventoryItem item = movement.getInventoryItem();
        if ("OUT".equals(movement.getType())) {
            if (item.getCurrentQuantity() < movement.getQuantity()) {
                throw new IllegalArgumentException("Stock insuffisant pour approuver cette sortie");
            }
            item.setCurrentQuantity(item.getCurrentQuantity() - movement.getQuantity());
            inventoryItemRepository.save(item);
        }

        movement.setStatus("APPROVED");
        movement.setApprovedBy(approverId);
        movement.setApprovedByName(approverName);
        movement.setApprovedAt(LocalDateTime.now());

        return stockMovementRepository.save(movement);
    }

    @Transactional
    public StockMovement rejectMovement(UUID movementId, UUID rejecterId, String rejecterName, String reason) {
        StockMovement movement = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new IllegalArgumentException("Mouvement introuvable"));

        if (!"PENDING".equals(movement.getStatus())) {
            throw new IllegalStateException("Ce mouvement n'est pas en attente de validation");
        }

        movement.setStatus("REJECTED");
        movement.setApprovedBy(rejecterId);
        movement.setApprovedByName(rejecterName);
        movement.setApprovedAt(LocalDateTime.now());
        movement.setRejectionReason(reason);

        return stockMovementRepository.save(movement);
    }

    @Transactional
    public List<StockMovement> recordBulkEntry(List<BulkEntryItem> entries, String recordedByName, String receivedBy, String supplier, String proofPhoto, UUID recordedBy) {
        List<StockMovement> movements = new ArrayList<>();
        for (BulkEntryItem entry : entries) {
            StockMovement movement = recordMovement(
                entry.getItemId(),
                entry.getQuantity(),
                "IN",
                entry.getReason() != null ? entry.getReason() : "Entrée en lot",
                proofPhoto,
                recordedByName,
                "NEUF",
                supplier,
                receivedBy,
                true, // IN is always auto-approved
                recordedBy
            );
            movements.add(movement);
        }
        return movements;
    }

    public List<StockMovement> getPendingMovementsForCommittee(UUID committeeId) {
        return stockMovementRepository.findPendingMovementsByCommitteeId(committeeId);
    }

    public List<StockMovement> getAllMovementsForCommittee(UUID committeeId) {
        return stockMovementRepository.findAllMovementsByCommitteeId(committeeId);
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
        item.setStorageLocationId(request.getStorageLocationId());
        return inventoryItemRepository.save(item);
    }

    // ----- Storage Location Methods -----

    @Transactional
    public StorageLocation createStorageLocation(StorageLocation location) {
        return storageLocationRepository.save(location);
    }

    public List<StorageLocation> getStorageLocationsForCommittee(UUID committeeId) {
        return storageLocationRepository.findByCommitteeId(committeeId);
    }

    @Transactional
    public StorageLocation updateStorageLocation(UUID locationId, StorageLocation updated) {
        StorageLocation existing = storageLocationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Storage location not found"));
        existing.setName(updated.getName());
        existing.setType(updated.getType());
        existing.setAcquisitionType(updated.getAcquisitionType());
        existing.setAddress(updated.getAddress());
        existing.setGpsLatitude(updated.getGpsLatitude());
        existing.setGpsLongitude(updated.getGpsLongitude());
        existing.setPhoto(updated.getPhoto());
        existing.setCapacity(updated.getCapacity());
        existing.setStatus(updated.getStatus());
        return storageLocationRepository.save(existing);
    }

    @Transactional
    public void deleteStorageLocation(UUID locationId) {
        storageLocationRepository.deleteById(locationId);
    }
}
