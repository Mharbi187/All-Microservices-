package com.nexusaid.core.controller;

import com.nexusaid.core.dto.InventoryDtos.CreateItemRequest;
import com.nexusaid.core.dto.InventoryDtos.RecordMovementRequest;
import com.nexusaid.core.entity.InventoryItem;
import com.nexusaid.core.entity.StockMovement;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
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

        return ResponseEntity.ok(inventoryService.recordMovement(
                itemId, request.getQuantity(), "IN", request.getReason(), userDetails.getUser().getId()));
    }

    @PostMapping("/{itemId}/movement/out")
    public ResponseEntity<StockMovement> stockOut(
            @PathVariable UUID itemId,
            @RequestBody RecordMovementRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        return ResponseEntity.ok(inventoryService.recordMovement(
                itemId, request.getQuantity(), "OUT", request.getReason(), userDetails.getUser().getId()));
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
}
