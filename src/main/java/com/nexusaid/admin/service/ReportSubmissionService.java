package com.nexusaid.admin.service;

import com.nexusaid.admin.dto.ReportBlockSubmitDto;
import com.nexusaid.admin.dto.ReportSubmitRequest;
import com.nexusaid.admin.entity.ReportBlockData;
import com.nexusaid.admin.entity.ReportInstance;
import com.nexusaid.admin.entity.SensitiveDataVault;
import com.nexusaid.admin.entity.Template;
import com.nexusaid.admin.entity.TemplateBlock;
import com.nexusaid.admin.repository.ReportBlockDataRepository;
import com.nexusaid.admin.repository.ReportInstanceRepository;
import com.nexusaid.admin.repository.SensitiveDataVaultRepository;
import com.nexusaid.admin.repository.TemplateBlockRepository;
import com.nexusaid.admin.repository.TemplateRepository;
import com.nexusaid.admin.event.EventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportSubmissionService {

    private final ReportInstanceRepository reportRepository;
    private final ReportBlockDataRepository blockDataRepository;
    private final SensitiveDataVaultRepository vaultRepository;
    private final TemplateRepository templateRepository;
    private final TemplateBlockRepository templateBlockRepository;
    private final EncryptionService encryptionService;
    private final EventPublisher eventPublisher;

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
                    .orElseThrow(
                            () -> new RuntimeException("Template block not found: " + blockDto.getTemplateBlockId()));

            // SECURITY INTERCEPTION
            if (templateBlock.getIsSensitive()) {
                // Encrypt payload directly
                EncryptionService.EncryptedData encryptedData = encryptionService.encrypt(blockDto.getContent());

                if (encryptedData != null) {
                    SensitiveDataVault vaultEntry = SensitiveDataVault.builder()
                            .report(savedReport)
                            .templateBlock(templateBlock)
                            .encryptedContent(encryptedData.getCipherText())
                            .iv(encryptedData.getIv())
                            .keyVersion(1)
                            .build();
                    vaultRepository.save(vaultEntry);
                }
            } else {
                // Save standard plaintext payload
                ReportBlockData plaintextData = ReportBlockData.builder()
                        .report(savedReport)
                        .templateBlock(templateBlock)
                        .content(blockDto.getContent())
                        .fileUrl(blockDto.getFileUrl())
                        .build();
                savedReport.addDataBlock(plaintextData);
                blockDataRepository.save(plaintextData);
            }
        }

        ReportInstance finalizedReport = reportRepository.save(savedReport);

        // Publish CDC event: report submitted to RabbitMQ for MS1 subscribers
        eventPublisher.publishReportPublished(
                finalizedReport.getId(),
                finalizedReport.getTemplate().getCreatorCommitteeId(),
                finalizedReport.getTemplate().getTitle());

        return finalizedReport;
    }
}
