package com.nexusaid.core.controller;

import com.nexusaid.core.dto.InventoryDtos.CreateItemRequest;
import com.nexusaid.core.dto.InventoryDtos.RecordMovementRequest;
import com.nexusaid.core.dto.InventoryDtos.BulkEntryRequest;
import com.nexusaid.core.entity.InventoryItem;
import com.nexusaid.core.entity.StockMovement;
import com.nexusaid.core.entity.StorageLocation;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'RESP_SANTE', 'RESP_SECOURISME', 'RESP_ACTION_SOCIALE', 'ADMIN')")
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping("/committees/{committeeId}")
    public ResponseEntity<List<InventoryItem>> getCommitteeInventory(
            @PathVariable UUID committeeId) {
        return ResponseEntity.ok(inventoryService.getInventoryForCommittee(committeeId));
    }

    @PostMapping
    public ResponseEntity<InventoryItem> createInventoryItem(
            @RequestBody CreateItemRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(inventoryService.createItem(request, userDetails.getUser().getId()));
    }

    @PostMapping("/{itemId}/movement/in")
    public ResponseEntity<StockMovement> stockIn(
            @PathVariable UUID itemId,
            @RequestBody RecordMovementRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        boolean isPresidentOrVp = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("PRESIDENT") || a.getAuthority().contains("VICE_PRESIDENT"));

        String recorderName = request.getRecordedByName() != null ? request.getRecordedByName() : userDetails.getUser().getFullName();
        String receiverName = request.getReceivedBy() != null ? request.getReceivedBy() : userDetails.getUser().getFullName();

        return ResponseEntity.ok(inventoryService.recordMovement(
                itemId, request.getQuantity(), "IN", request.getReason(), request.getProofPhoto(),
                recorderName, "NEUF", request.getSupplier(), receiverName, isPresidentOrVp, userDetails.getUser().getId()));
    }

    @PostMapping("/{itemId}/movement/out")
    public ResponseEntity<StockMovement> stockOut(
            @PathVariable UUID itemId,
            @RequestBody RecordMovementRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        boolean isPresidentOrVp = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().contains("PRESIDENT") || a.getAuthority().contains("VICE_PRESIDENT"));

        String recorderName = request.getRecordedByName() != null ? request.getRecordedByName() : userDetails.getUser().getFullName();
        String condition = request.getItemCondition() != null ? request.getItemCondition() : "BON_ETAT";

        return ResponseEntity.ok(inventoryService.recordMovement(
                itemId, request.getQuantity(), "OUT", request.getReason(), request.getProofPhoto(),
                recorderName, condition, null, null, isPresidentOrVp, userDetails.getUser().getId()));
    }

    @GetMapping("/{itemId}/movements")
    public ResponseEntity<List<StockMovement>> getMovements(@PathVariable UUID itemId) {
        return ResponseEntity.ok(inventoryService.getMovements(itemId));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<String> deleteItem(@PathVariable UUID itemId) {
        inventoryService.deleteItem(itemId);
        return ResponseEntity.ok("Article supprimé avec succès.");
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<InventoryItem> updateItem(
            @PathVariable UUID itemId,
            @RequestBody CreateItemRequest request) {
        return ResponseEntity.ok(inventoryService.updateItem(itemId, request));
    }

    // ----- Bulk Entry Endpoint -----

    @PostMapping("/bulk-entry")
    public ResponseEntity<List<StockMovement>> recordBulkEntry(
            @RequestBody BulkEntryRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        String recorderName = request.getRecordedByName() != null ? request.getRecordedByName() : userDetails.getUser().getFullName();
        String receiverName = request.getReceivedBy() != null ? request.getReceivedBy() : userDetails.getUser().getFullName();

        return ResponseEntity.ok(inventoryService.recordBulkEntry(
                request.getEntries(), recorderName, receiverName, request.getSupplier(), request.getProofPhoto(), userDetails.getUser().getId()));
    }

    // ----- Advanced Movement Validation -----

    @GetMapping("/committees/{committeeId}/pending-movements")
    public ResponseEntity<List<StockMovement>> getPendingMovements(
            @PathVariable UUID committeeId) {
        return ResponseEntity.ok(inventoryService.getPendingMovementsForCommittee(committeeId));
    }

    @GetMapping("/committees/{committeeId}/movements")
    public ResponseEntity<List<StockMovement>> getAllMovementsForCommittee(
            @PathVariable UUID committeeId) {
        return ResponseEntity.ok(inventoryService.getAllMovementsForCommittee(committeeId));
    }

    @PutMapping("/movements/{movementId}/approve")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'ADMIN')")
    public ResponseEntity<StockMovement> approveMovement(
            @PathVariable UUID movementId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(inventoryService.approveMovement(
                movementId, userDetails.getUser().getId(), userDetails.getUser().getFullName()));
    }

    @PutMapping("/movements/{movementId}/reject")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'ADMIN')")
    public ResponseEntity<StockMovement> rejectMovement(
            @PathVariable UUID movementId,
            @RequestParam String reason,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(inventoryService.rejectMovement(
                movementId, userDetails.getUser().getId(), userDetails.getUser().getFullName(), reason));
    }

    // ----- Storage Location Endpoints -----

    @PostMapping("/locations")
    public ResponseEntity<StorageLocation> createStorageLocation(@RequestBody StorageLocation location) {
        return ResponseEntity.ok(inventoryService.createStorageLocation(location));
    }

    @GetMapping("/locations/committees/{committeeId}")
    public ResponseEntity<List<StorageLocation>> getStorageLocations(@PathVariable UUID committeeId) {
        return ResponseEntity.ok(inventoryService.getStorageLocationsForCommittee(committeeId));
    }

    @PutMapping("/locations/{id}")
    public ResponseEntity<StorageLocation> updateStorageLocation(
            @PathVariable UUID id,
            @RequestBody StorageLocation location) {
        return ResponseEntity.ok(inventoryService.updateStorageLocation(id, location));
    }

    @DeleteMapping("/locations/{id}")
    public ResponseEntity<String> deleteStorageLocation(@PathVariable UUID id) {
        inventoryService.deleteStorageLocation(id);
        return ResponseEntity.ok("Local de stockage supprimé avec succès.");
    }
}
