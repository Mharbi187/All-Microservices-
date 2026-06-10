package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.DonationDtos.*;
import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.entity.InKindDonation;
import com.nexusaid.admin.entity.MonetaryDonation;
import com.nexusaid.admin.repository.InKindDonationRepository;
import com.nexusaid.admin.repository.MonetaryDonationRepository;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.CommitteeHierarchyService;
import com.nexusaid.admin.service.DonationService;
import com.nexusaid.admin.service.PdfReceiptGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/donations")
@RequiredArgsConstructor
public class DonationController {

    private final DonationService donationService;
    private final PdfReceiptGeneratorService pdfService;
    private final MonetaryDonationRepository monetaryDocRepo;
    private final InKindDonationRepository inKindDocRepo;
    private final CommitteeHierarchyService hierarchyService;

    // ─── 1. Public (Donateurs) ───────────────────────────────────────────────

    @GetMapping("/needs/active")
    public ResponseEntity<List<DonationNeed>> getActiveNeeds() {
        return ResponseEntity.ok(donationService.getActivePublicNeeds());
    }

    // ─── 2. Responsables de Comité (Création & Suivi) ─────────────────────────

    @PostMapping("/needs")
    @PreAuthorize("hasAnyRole('RESP_CATASTROPHES', 'RESP_ACTION_SOCIALE', 'RESP_SANTE', 'PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN')")
    public ResponseEntity<DonationNeed> createExpectedNeed(
            @RequestBody CreateNeedRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        String roleName = userDetails.getAuthorities().isEmpty() ? "UNKNOWN" : userDetails.getAuthorities().iterator().next().getAuthority();
        String creatorName = "Responsable"; // Can be mapped from user profile or Feign later
        DonationNeed need = donationService.createNeed(request, userDetails.getUser().getId(), creatorName, roleName);
        return ResponseEntity.status(HttpStatus.CREATED).body(need);
    }

    @GetMapping("/needs/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DonationNeed>> getMyCreatedNeeds(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(donationService.getMyCreatedNeeds(userDetails.getUser().getId()));
    }

    // ─── 3. Présidents & VP (Validation & Rejet) ──────────────────────────────

    @GetMapping("/needs/pending")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN')")
    public ResponseEntity<Page<DonationNeed>> getPendingNeeds(
            HttpServletRequest req,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
                
        String authHeader = req.getHeader("Authorization");
        List<UUID> accessibleIds = hierarchyService.getAccessibleCommitteeIds(authHeader);
        return ResponseEntity.ok(donationService.getPendingNeeds(accessibleIds, PageRequest.of(page, size)));
    }

    @GetMapping("/needs/committee")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN')")
    public ResponseEntity<Page<DonationNeed>> getCommitteeNeeds(
            HttpServletRequest req,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
                
        String authHeader = req.getHeader("Authorization");
        List<UUID> accessibleIds = hierarchyService.getAccessibleCommitteeIds(authHeader);
        return ResponseEntity.ok(donationService.getCommitteeNeeds(accessibleIds, PageRequest.of(page, size)));
    }

    @PutMapping("/needs/{id}/validate")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN') and @donationSecurity.canValidateNeedFor(#id, authentication)")
    public ResponseEntity<DonationNeed> validateNeed(
            @PathVariable UUID id,
            @RequestBody ValidateNeedRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        request.setValidatorName("Président/VP"); 
        DonationNeed need = donationService.validateNeed(id, userDetails.getUser().getId(), request);
        return ResponseEntity.ok(need);
    }

    // ─── 4. Statistiques ──────────────────────────────────────────────────────

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN')")
    public ResponseEntity<DonationStatsResponse> getStats(HttpServletRequest req) {
        String authHeader = req.getHeader("Authorization");
        List<UUID> accessibleIds = hierarchyService.getAccessibleCommitteeIds(authHeader);
        return ResponseEntity.ok(donationService.getStats(accessibleIds));
    }

    // ─── 5. Réception de Dons & Reçus ─────────────────────────────────────────

    @PostMapping("/monetary")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN', 'RESP_CATASTROPHES', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<DonationReceiptResponse> processMonetaryDonation(
            @RequestBody CreateMonetaryDonationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        DonationReceiptResponse response = donationService.processMonetaryDonation(request, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/in-kind")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN', 'RESP_CATASTROPHES', 'RESP_ACTION_SOCIALE')")
    public ResponseEntity<DonationReceiptResponse> processInKindDonation(
            @RequestBody CreateInKindDonationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        DonationReceiptResponse response = donationService.processInKindDonation(request, userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/receipts/{receiptNumber}/verify")
    public ResponseEntity<?> verifyReceipt(@PathVariable String receiptNumber) {
        MonetaryDonation mDoc = monetaryDocRepo.findAll().stream()
                .filter(d -> d.getReceiptNumber().equals(receiptNumber)).findFirst().orElse(null);

        if (mDoc != null) {
            return ResponseEntity.ok(java.util.Map.of(
                    "valid", true, "type", "MONETARY", "receiptNumber", receiptNumber,
                    "amount", mDoc.getAmount() + " " + mDoc.getCurrency(),
                    "date", mDoc.getReceiptDate().toString(),
                    "donor", mDoc.getDonorName() != null ? mDoc.getDonorName() : "Anonyme"));
        }

        InKindDonation kDoc = inKindDocRepo.findAll().stream()
                .filter(d -> d.getReceiptNumber().equals(receiptNumber)).findFirst().orElse(null);

        if (kDoc != null) {
            return ResponseEntity.ok(java.util.Map.of(
                    "valid", true, "type", "IN_KIND", "receiptNumber", receiptNumber,
                    "date", kDoc.getReceiptDate().toString(),
                    "donor", kDoc.getDonorName() != null ? kDoc.getDonorName() : "Anonyme"));
        }

        return ResponseEntity.ok(java.util.Map.of("valid", false, "message", "Receipt not found"));
    }

    @GetMapping("/receipts/pdf/{receiptNumber}")
    public ResponseEntity<byte[]> downloadPdfReceipt(@PathVariable String receiptNumber) {

        String donorName = "Anonyme";
        String amountOrItems = "";
        String date = "";
        String qrData = "";

        MonetaryDonation mDoc = monetaryDocRepo.findAll().stream()
                .filter(d -> d.getReceiptNumber().equals(receiptNumber)).findFirst().orElse(null);

        if (mDoc != null) {
            donorName = mDoc.getDonorName();
            amountOrItems = mDoc.getAmount() + " " + mDoc.getCurrency();
            date = mDoc.getReceiptDate().format(DateTimeFormatter.ISO_DATE);
            qrData = mDoc.getQrCodeData();
        } else {
            InKindDonation kDoc = inKindDocRepo.findAll().stream()
                    .filter(d -> d.getReceiptNumber().equals(receiptNumber)).findFirst().orElse(null);

            if (kDoc != null) {
                donorName = kDoc.getDonorName();
                amountOrItems = "Don en nature (Voir JSON)"; 
                date = kDoc.getReceiptDate().format(DateTimeFormatter.ISO_DATE);
                qrData = kDoc.getQrCodeData();
            } else {
                return ResponseEntity.notFound().build();
            }
        }

        byte[] pdfBytes = pdfService.generatePdfReceipt(receiptNumber, donorName, amountOrItems, date, qrData);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "Recu_" + receiptNumber + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }
}
