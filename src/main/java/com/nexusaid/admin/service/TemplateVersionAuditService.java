package com.nexusaid.admin.service;

import com.nexusaid.admin.entity.TemplateVersion;
import com.nexusaid.admin.entity.TemplateVersionAudit;
import com.nexusaid.admin.repository.TemplateVersionAuditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TemplateVersionAuditService {

    private final TemplateVersionAuditRepository auditRepository;

    @Transactional
    public void log(TemplateVersion version, String action, UUID userId) {
        TemplateVersionAudit audit = TemplateVersionAudit.builder()
                .templateVersion(version)
                .action(action)
                .userId(userId)
                .timestamp(Instant.now())
                .build();
        auditRepository.save(audit);
    }
}
