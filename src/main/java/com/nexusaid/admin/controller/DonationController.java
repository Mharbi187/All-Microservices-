package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.DonationDtos.*;
import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.entity.InKindDonation;
import com.nexusaid.admin.entity.MonetaryDonation;
import com.nexusaid.admin.repository.InKindDonationRepository;
import com.nexusaid.admin.repository.MonetaryDonationRepository;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.DonationService;
import com.nexusaid.admin.service.PdfReceiptGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/donations")
@RequiredArgsConstructor
public class DonationController {

    private final DonationService donationService;
    private final PdfReceiptGeneratorService pdfService;
    private final MonetaryDonationRepository monetaryDocRepo;
    private final InKindDonationRepository inKindDocRepo;

    // 1. Map Endpoint (Can be visible to public or anyone depending on
    // SecurityConfig rules)
    @GetMapping("/needs/active")
    public ResponseEntity<List<DonationNeed>> getActiveNeeds() {
        return ResponseEntity.ok(donationService.getActiveNeeds());
    }

    // 2. Publish a new Need
    @PostMapping("/needs")
    public ResponseEntity<DonationNeed> createExpectedNeed(
            @RequestBody CreateNeedRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        // We extract user info for tracing who published the need
        String roleName = userDetails.getAuthorities().isEmpty() ? "UNKNOWN"
                : userDetails.getAuthorities().iterator().next().getAuthority();
        DonationNeed need = donationService.createNeed(request, userDetails.getUser().getId(), roleName);
        return ResponseEntity.status(HttpStatus.CREATED).body(need);
    }

    // 3. Process Monetary Donation (On-Site by Volunteer)
    @PostMapping("/monetary")
    public ResponseEntity<DonationReceiptResponse> processMonetaryDonation(
            @RequestBody CreateMonetaryDonationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        DonationReceiptResponse response = donationService.processMonetaryDonation(request,
                userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 4. Process In-Kind Donation (On-Site by Volunteer)
    @PostMapping("/in-kind")
    public ResponseEntity<DonationReceiptResponse> processInKindDonation(
            @RequestBody CreateInKindDonationRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        DonationReceiptResponse response = donationService.processInKindDonation(request,
                userDetails.getUser().getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 5. Verify receipt authenticity (QR scan endpoint)
    @GetMapping("/receipts/{receiptNumber}/verify")
    public ResponseEntity<?> verifyReceipt(@PathVariable String receiptNumber) {
        MonetaryDonation mDoc = monetaryDocRepo.findAll().stream()
                .filter(d -> d.getReceiptNumber().equals(receiptNumber)).findFirst().orElse(null);

        if (mDoc != null) {
            return ResponseEntity.ok(java.util.Map.of(
                    "valid", true,
                    "type", "MONETARY",
                    "receiptNumber", receiptNumber,
                    "amount", mDoc.getAmount() + " " + mDoc.getCurrency(),
                    "date", mDoc.getReceiptDate().toString(),
                    "donor", mDoc.getDonorName() != null ? mDoc.getDonorName() : "Anonyme"));
        }

        InKindDonation kDoc = inKindDocRepo.findAll().stream()
                .filter(d -> d.getReceiptNumber().equals(receiptNumber)).findFirst().orElse(null);

        if (kDoc != null) {
            return ResponseEntity.ok(java.util.Map.of(
                    "valid", true,
                    "type", "IN_KIND",
                    "receiptNumber", receiptNumber,
                    "date", kDoc.getReceiptDate().toString(),
                    "donor", kDoc.getDonorName() != null ? kDoc.getDonorName() : "Anonyme"));
        }

        return ResponseEntity.ok(java.util.Map.of("valid", false, "message", "Receipt not found"));
    }

    // 6. Download the auto-generated PDF receipt
    @GetMapping("/receipts/pdf/{receiptNumber}")
    public ResponseEntity<byte[]> downloadPdfReceipt(@PathVariable String receiptNumber) {

        // Find monetary or inKind
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
                amountOrItems = "Don en nature (Voir JSON)"; // Could parse the JSONB here
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
