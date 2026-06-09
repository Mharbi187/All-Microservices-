package com.nexusaid.admin.service;

import com.nexusaid.admin.dto.CreateDraftReportRequest;
import com.nexusaid.admin.dto.ReportBlockSubmitDto;
import com.nexusaid.admin.dto.ReportSubmitRequest;
import com.nexusaid.admin.dto.UpdateFilledDataRequest;
import com.nexusaid.admin.entity.*;
import com.nexusaid.admin.exception.ReportImmutableException;
import com.nexusaid.admin.repository.*;
import com.nexusaid.admin.event.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Async;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportSubmissionService {

    private final ReportInstanceRepository reportRepository;
    private final ReportBlockDataRepository blockDataRepository;
    private final SensitiveDataVaultRepository vaultRepository;
    private final TemplateRepository templateRepository;
    private final TemplateBlockRepository templateBlockRepository;
    private final TemplateVersionRepository versionRepository;
    private final EncryptionService encryptionService;
    private final EventPublisher eventPublisher;
    private final AuditLogService auditLogService;
    private final PdfGenerationService pdfGenerationService;
    private final TemplatePreviewService previewService;
    private final FileStorageService fileStorageService;

    // ── v2: Draft creation ────────────────────────────────────────────────────

    /**
     * Creates a new DRAFT report pinned to a specific published TemplateVersion.
     * The templateVersionId is chosen explicitly — NEVER auto-resolved to latest.
     */
    @Transactional
    public ReportInstance createDraftFromVersion(CreateDraftReportRequest request, UUID userId) {
        TemplateVersion version = versionRepository.findById(request.templateVersionId())
                .orElseThrow(() -> new RuntimeException("TemplateVersion not found: " + request.templateVersionId()));

        if (!"PUBLISHED".equals(version.getStatus())) {
            throw new IllegalStateException("Cannot create a report from an unpublished template version.");
        }

        ReportInstance draft = ReportInstance.builder()
                .template(version.getTemplate())
                .templateVersion(version)
                .filledBy(userId)
                .title(request.title())
                .reportLevel(request.reportLevel())
                .workflowStatus("DRAFT")
                .build();

        if (request.assignedTo() != null) {
            draft.getAssignedUsers().add(request.assignedTo());
        }

        ReportInstance saved = reportRepository.save(draft);
        auditLogService.log(saved.getId(), "CREATED", userId);
        log.info("Draft report created: id={} templateVersion={}", saved.getId(), version.getId());
        return saved;
    }

    /**
     * Autosave: updates the filledData JSONB of a DRAFT report.
     * Throws ReportImmutableException if the report is ARCHIVED.
     */
    @Transactional
    public ReportInstance updateFilledData(UUID reportId, UpdateFilledDataRequest request, UUID userId) {
        ReportInstance report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found: " + reportId));

        if ("ARCHIVED".equals(report.getWorkflowStatus())) {
            throw new ReportImmutableException(reportId.toString());
        }
        if (!"DRAFT".equals(report.getWorkflowStatus())) {
            throw new IllegalStateException("Cannot update data of a report in status: " + report.getWorkflowStatus());
        }

        report.setFilledData(request.filledData());
        return reportRepository.save(report);
    }

    // ── v2: Workflow transitions ──────────────────────────────────────────────

    @Transactional
    public ReportInstance submitDraftReport(UUID reportId, UUID userId) {
        ReportInstance report = getAndGuardImmutable(reportId);
        if (!"DRAFT".equals(report.getWorkflowStatus())) {
            throw new IllegalStateException("Only DRAFT reports can be submitted.");
        }
        report.setWorkflowStatus("SUBMITTED");
        report.setSubmittedAt(LocalDateTime.now());
        ReportInstance saved = reportRepository.save(report);
        auditLogService.log(reportId, "SUBMITTED", userId);
        eventPublisher.publishReportSubmitted(reportId, userId, report.getTitle());
        return saved;
    }

    @Transactional
    public ReportInstance validateReport(UUID reportId, UUID validatorId) {
        ReportInstance report = getAndGuardImmutable(reportId);
        if (!"SUBMITTED".equals(report.getWorkflowStatus())) {
            throw new IllegalStateException("Report must be SUBMITTED to validate.");
        }
        report.setWorkflowStatus("VALIDATED");
        report.setValidatedBy(validatorId);
        report.setValidatedAt(LocalDateTime.now());
        ReportInstance saved = reportRepository.save(report);
        auditLogService.log(reportId, "VALIDATED", validatorId);
        eventPublisher.publishReportValidated(reportId, validatorId);
        return saved;
    }

    @Transactional
    public ReportInstance finalizeReport(UUID reportId, UUID finalizedById) {
        ReportInstance report = getAndGuardImmutable(reportId);
        if (!"VALIDATED".equals(report.getWorkflowStatus())) {
            throw new IllegalStateException("Report must be VALIDATED before finalization.");
        }
        report.setWorkflowStatus("FINALIZED");
        report.setFinalizedBy(finalizedById);
        report.setFinalizedAt(Instant.now());
        ReportInstance saved = reportRepository.save(report);
        auditLogService.log(reportId, "FINALIZED", finalizedById);
        eventPublisher.publishReportFinalized(reportId, finalizedById);
        return saved;
    }

    /**
     * Archives a FINALIZED report:
     * 1. Computes SHA-256(filledData) as content hash.
     * 2. Sets status = ARCHIVED and marks the report immutable.
     * 3. Logs the transition + publishes RabbitMQ event.
     */
    @Transactional
    public ReportInstance archiveReport(UUID reportId, UUID archivedBy, boolean encrypt) {
        ReportInstance report = getAndGuardImmutable(reportId);
        if (!"FINALIZED".equals(report.getWorkflowStatus())) {
            throw new IllegalStateException("Only FINALIZED reports can be archived.");
        }

        // 1 — Content hash (on unencrypted plaintext data)
        String filledDataJson = report.getFilledData() != null ? report.getFilledData().toString() : "{}";
        String contentHash = sha256Hex(filledDataJson.getBytes(StandardCharsets.UTF_8));

        // 2 — Encrypt data if requested
        if (encrypt && report.getFilledData() != null) {
            EncryptionService.EncryptedData encryptedData = encryptionService.encrypt(filledDataJson);
            com.fasterxml.jackson.databind.node.ObjectNode secureNode = new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode();
            secureNode.put("_encrypted", true);
            secureNode.put("cipherText", encryptedData.getCipherText());
            secureNode.put("iv", encryptedData.getIv());
            report.setFilledData(secureNode);
        }

        // 3 — Update report fields
        report.setWorkflowStatus("ARCHIVED");
        report.setArchivedBy(archivedBy);
        report.setArchivedAt(LocalDateTime.now());
        report.setContentHash(contentHash);

        ReportInstance saved = reportRepository.save(report);
        auditLogService.log(reportId, "ARCHIVED", archivedBy);
        eventPublisher.publishReportArchived(reportId, archivedBy, contentHash);

        log.info("Report archived: id={} contentHash={} encrypted={}", reportId, contentHash, encrypt);
        return saved;
    }

    /**
     * Generates Official PDF after FINALIZATION.
     * Uploads to MinIO and saves the URL in DB.
     */
    @Async
    @Transactional
    public CompletableFuture<String> generateOfficialPdf(UUID reportId, boolean force, UUID generatedBy) {
        ReportInstance report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found: " + reportId));
        
        if (!"FINALIZED".equals(report.getWorkflowStatus()) && !"ARCHIVED".equals(report.getWorkflowStatus())) {
            throw new IllegalStateException("Only FINALIZED or ARCHIVED reports can have official PDFs.");
        }

        if (report.getPdfUrl() != null && !force) {
            log.info("PDF already exists for report {} and force=false. Returning existing URL.", reportId);
            return CompletableFuture.completedFuture(report.getPdfUrl());
        }

        long startTime = System.currentTimeMillis();

        com.fasterxml.jackson.databind.JsonNode data = report.getFilledData();
        if (data != null && data.has("_encrypted") && data.get("_encrypted").asBoolean()) {
            try {
                String cipherText = data.get("cipherText").asText();
                String iv = data.get("iv").asText();
                String plainText = encryptionService.decrypt(new EncryptionService.EncryptedData(cipherText, iv));
                data = new com.fasterxml.jackson.databind.ObjectMapper().readTree(plainText);
            } catch (Exception e) {
                log.error("Failed to decrypt report data for PDF generation", e);
                throw new RuntimeException("Cannot generate PDF: Data is encrypted and decryption failed.", e);
            }
        }

        String html = previewService.renderFilledHtml(
                report.getTemplateVersion() != null ? report.getTemplateVersion().getStructure() : null,
                data
        );
        byte[] pdfBytes = pdfGenerationService.generateFromHtml(html);

        int year = LocalDateTime.now().getYear();
        Integer version = report.getPdfVersion() == null ? 1 : report.getPdfVersion() + (force ? 1 : 0);
        String pdfKey = "reports/" + year + "/" + reportId + "_v" + version + ".pdf";

        // Upload to MinIO
        fileStorageService.upload("reports", pdfKey, pdfBytes, "application/pdf");
        
        // Save metadata
        report.setPdfStorageKey(pdfKey);
        report.setPdfUrl("/api/v1/admin/reports/" + reportId + "/pdf"); // Direct download link or we can use PresignedUrl
        report.setPdfGeneratedAt(LocalDateTime.now());
        report.setPdfVersion(version);

        reportRepository.save(report);
        auditLogService.log(reportId, "OFFICIAL_PDF_GENERATED", generatedBy);
        
        log.info("Official PDF generated for report {}: took {}ms, key={}", reportId, System.currentTimeMillis() - startTime, pdfKey);

        return CompletableFuture.completedFuture(report.getPdfUrl());
    }

    /**
     * Generates a preview Draft PDF without saving it to MinIO.
     */
    public byte[] exportDraftPdf(UUID reportId) {
        ReportInstance report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found: " + reportId));

        com.fasterxml.jackson.databind.JsonNode data = report.getFilledData();
        if (data != null && data.has("_encrypted") && data.get("_encrypted").asBoolean()) {
            try {
                String cipherText = data.get("cipherText").asText();
                String iv = data.get("iv").asText();
                String plainText = encryptionService.decrypt(new EncryptionService.EncryptedData(cipherText, iv));
                data = new com.fasterxml.jackson.databind.ObjectMapper().readTree(plainText);
            } catch (Exception e) {
                log.error("Failed to decrypt report data for PDF generation", e);
                throw new RuntimeException("Cannot generate PDF: Data is encrypted and decryption failed.", e);
            }
        }

        String html = previewService.renderFilledHtml(
                report.getTemplateVersion() != null ? report.getTemplateVersion().getStructure() : null,
                data
        );
        
        // Add draft watermark to HTML if needed here
        html = html.replace("<div class='page'>", "<div class='page'><div style='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:100px;color:rgba(200,200,200,0.3);z-index:9999;pointer-events:none;'>DRAFT</div>");

        return pdfGenerationService.generateFromHtml(html);
    }


    // ── Legacy: v1 block-based submission ────────────────────────────────────

    @Transactional
    public ReportInstance submitReport(ReportSubmitRequest request, UUID submitterId) {
        Template template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new RuntimeException("Template not found"));

        if (!template.getIsActive()) {
            throw new RuntimeException("Template is not active");
        }

        ReportInstance report = ReportInstance.builder()
                .template(template)
                .filledBy(submitterId)
                .title(request.getTitle())
                .reportLevel(request.getReportLevel())
                .workflowStatus("SUBMITTED")
                .submittedAt(LocalDateTime.now())
                .build();

        ReportInstance savedReport = reportRepository.save(report);

        for (ReportBlockSubmitDto blockDto : request.getBlocks()) {
            TemplateBlock templateBlock = templateBlockRepository.findById(blockDto.getTemplateBlockId())
                    .orElseThrow(() -> new RuntimeException("Template block not found: " + blockDto.getTemplateBlockId()));

            if (templateBlock.getIsSensitive()) {
                EncryptionService.EncryptedData encryptedData = encryptionService.encrypt(blockDto.getContent());
                if (encryptedData != null) {
                    SensitiveDataVault vaultEntry = SensitiveDataVault.builder()
                            .report(savedReport).templateBlock(templateBlock)
                            .encryptedContent(encryptedData.getCipherText())
                            .iv(encryptedData.getIv()).keyVersion(1).build();
                    vaultRepository.save(vaultEntry);
                }
            } else {
                ReportBlockData plaintextData = ReportBlockData.builder()
                        .report(savedReport).templateBlock(templateBlock)
                        .content(blockDto.getContent()).fileUrl(blockDto.getFileUrl()).build();
                savedReport.addDataBlock(plaintextData);
                blockDataRepository.save(plaintextData);
            }
        }

        ReportInstance finalizedReport = reportRepository.save(savedReport);
        auditLogService.log(finalizedReport.getId(), "SUBMITTED", submitterId);
        eventPublisher.publishReportSubmitted(finalizedReport.getId(), submitterId, finalizedReport.getTitle());
        return finalizedReport;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    public java.util.List<ReportInstance> getAssignedReports(UUID userId) {
        return reportRepository.findByAssignedUsersContaining(userId);
    }

    private ReportInstance getAndGuardImmutable(UUID reportId) {
        ReportInstance report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found: " + reportId));
        if ("ARCHIVED".equals(report.getWorkflowStatus())) {
            throw new ReportImmutableException(reportId.toString());
        }
        return report;
    }

    private String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 computation failed", e);
        }
    }
}
