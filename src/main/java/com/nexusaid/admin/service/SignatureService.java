package com.nexusaid.admin.service;

import com.nexusaid.admin.dto.SaveSignatureRequest;
import com.nexusaid.admin.entity.Signature;
import com.nexusaid.admin.repository.SignatureRepository;
import com.nexusaid.admin.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Handles digital signature capture, storage, and verification.
 *
 * Security model:
 * - userId and signerRole are extracted from the JWT principal (server-side) — never trusted from request body.
 * - bindingHash = SHA-256(imageHash + userId + reportId + signedAt) cryptographically binds
 *   the signature image to the authenticated identity.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SignatureService {

    private static final String SIGNATURE_BUCKET = "nexusaid-signatures";

    private final SignatureRepository signatureRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public Signature saveSignature(SaveSignatureRequest request, UserDetailsImpl principal) {
        UUID userId = principal.getUser().getId();
        String signerRole = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("UNKNOWN");

        // Decode the base64 image
        byte[] imageBytes = Base64.getDecoder().decode(
                request.imageBase64().replaceFirst("^data:image/[^;]+;base64,", "")
        );

        // Compute image content hash
        String imageHash = sha256Hex(imageBytes);

        // Compute identity-binding hash: ties the image to the authenticated user + report + timestamp
        Instant signedAt = Instant.now();
        String bindingInput = imageHash + userId + request.reportId() + signedAt;
        String bindingHash = sha256Hex(bindingInput.getBytes(StandardCharsets.UTF_8));

        // Upload image to MinIO
        String minioKey = "signatures/" + UUID.randomUUID() + ".png";
        fileStorageService.upload(SIGNATURE_BUCKET, minioKey, imageBytes, "image/png");

        Signature signature = Signature.builder()
                .reportId(request.reportId())
                .userId(userId)
                .imageUrl(minioKey)
                .imageHash(imageHash)
                .bindingHash(bindingHash)
                .signerRole(signerRole)
                .signedAt(signedAt)
                .verified(false)
                .build();

        Signature saved = signatureRepository.save(signature);
        log.info("Signature saved: id={} reportId={} userId={}", saved.getId(), request.reportId(), userId);
        return saved;
    }

    @Transactional
    public boolean verifySignature(UUID signatureId) {
        Signature sig = signatureRepository.findById(signatureId)
                .orElseThrow(() -> new RuntimeException("Signature not found: " + signatureId));

        // Re-download image and recompute hash
        byte[] imageBytes = fileStorageService.download(SIGNATURE_BUCKET, sig.getImageUrl());
        String recomputedHash = sha256Hex(imageBytes);

        boolean valid = recomputedHash.equals(sig.getImageHash());
        sig.setVerified(valid);
        signatureRepository.save(sig);
        log.info("Signature verification: id={} valid={}", signatureId, valid);
        return valid;
    }

    @Transactional(readOnly = true)
    public List<Signature> getSignaturesForReport(UUID reportId) {
        return signatureRepository.findByReportId(reportId);
    }

    @Transactional
    public void deleteSignature(UUID signatureId, UUID requestingUserId) {
        Signature sig = signatureRepository.findById(signatureId)
                .orElseThrow(() -> new RuntimeException("Signature not found: " + signatureId));
        // Only the original signer can delete their own signature
        if (!sig.getUserId().equals(requestingUserId)) {
            throw new SecurityException("Cannot delete another user's signature.");
        }
        signatureRepository.delete(sig);
    }

    // ── Utility ──────────────────────────────────────────────────────────────

    private String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 computation failed", e);
        }
    }

    private String sha256Hex(String data) {
        return sha256Hex(data.getBytes(StandardCharsets.UTF_8));
    }
}
