package com.nexusaid.core.controller;

import com.nexusaid.core.dto.DonationDtos.*;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.DonationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/donations")
@RequiredArgsConstructor
public class DonationController {

    private final DonationService donationService;

    // --- NEEDS ---

    @GetMapping("/needs")
    @PreAuthorize("hasAnyRole('DONOR', 'PRESIDENT', 'ADMIN')")
    public ResponseEntity<List<DonationNeedDto>> getNeeds() {
        return ResponseEntity.ok(donationService.getAllActiveNeeds());
    }

    @PostMapping("/needs/{committeeId}")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<DonationNeedDto> createNeed(
            @PathVariable UUID committeeId,
            @RequestBody DonationNeedCreateDto dto) {
        return ResponseEntity.ok(donationService.createNeed(committeeId, dto));
    }

    // --- DONATIONS ---

    @PostMapping
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<DonationDto> makeDonation(
            @RequestBody DonationCreateDto dto,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(donationService.createDonation(userDetails.getUser().getId(), dto));
    }

    @GetMapping("/my-receipts")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<List<DonationReceiptDto>> getMyReceipts(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(donationService.getMyReceipts(userDetails.getUser().getId()));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('DONOR')")
    public ResponseEntity<DonorStatsDto> getMyStats(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(donationService.getDonorStats(userDetails.getUser().getId()));
    }

    // --- VALIDATION (Admin/President) ---

    @PostMapping("/{donationId}/validate")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'ADMIN')")
    public ResponseEntity<DonationReceiptDto> validateDonation(
            @PathVariable UUID donationId,
            @RequestBody(required = false) String validationNote,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(donationService.validateDonation(donationId, userDetails.getUser().getId(), validationNote));
    }
}
