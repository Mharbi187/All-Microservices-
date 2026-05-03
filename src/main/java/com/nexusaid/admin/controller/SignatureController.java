package com.nexusaid.admin.controller;

import com.nexusaid.admin.dto.SaveSignatureRequest;
import com.nexusaid.admin.entity.Signature;
import com.nexusaid.admin.security.UserDetailsImpl;
import com.nexusaid.admin.service.SignatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/signatures")
@RequiredArgsConstructor
public class SignatureController {

    private final SignatureService signatureService;

    /**
     * Captures and saves a digital signature.
     * Identity is extracted from the JWT principal — NOT from request body.
     */
    @PostMapping
    public ResponseEntity<Signature> saveSignature(
            @Valid @RequestBody SaveSignatureRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        Signature signature = signatureService.saveSignature(request, userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(signature);
    }

    /**
     * Lists all signatures for a given report.
     */
    @GetMapping("/report/{reportId}")
    public ResponseEntity<List<Signature>> getSignaturesForReport(@PathVariable UUID reportId) {
        return ResponseEntity.ok(signatureService.getSignaturesForReport(reportId));
    }

    /**
     * Verifies a signature by re-downloading the image from MinIO and recomputing its hash.
     */
    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verifySignature(@PathVariable UUID id) {
        boolean valid = signatureService.verifySignature(id);
        return ResponseEntity.ok(Map.of("signatureId", id, "valid", valid));
    }

    /**
     * Deletes a signature — only the original signer can delete their own.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSignature(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        signatureService.deleteSignature(id, userDetails.getUser().getId());
        return ResponseEntity.noContent().build();
    }
}
