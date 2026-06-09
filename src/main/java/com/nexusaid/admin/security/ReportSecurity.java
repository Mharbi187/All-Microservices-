package com.nexusaid.admin.security;

import com.nexusaid.admin.entity.ReportInstance;
import com.nexusaid.admin.repository.ReportInstanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("reportSecurity")
@RequiredArgsConstructor
public class ReportSecurity {

    private final ReportInstanceRepository reportRepository;

    public boolean canGenerate(Authentication authentication, UUID reportId) {
        if (hasRole(authentication, "PRESIDENT") || hasRole(authentication, "SECRETAIRE_GENERAL") || hasRole(authentication, "RESPONSABLE")) {
            return true;
        }
        return false; // VOLUNTEER cannot generate official PDF
    }

    public boolean canArchive(Authentication authentication) {
        return hasRole(authentication, "PRESIDENT");
    }


    public boolean canDownload(Authentication authentication, UUID reportId) {
        if (hasRole(authentication, "PRESIDENT") || hasRole(authentication, "SECRETAIRE_GENERAL")) {
            return true;
        }

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UUID userId = userDetails.getUser().getId();

        ReportInstance report = reportRepository.findById(reportId).orElse(null);
        if (report == null) return false;

        // Rule 1: Owner Access
        if (report.getFilledBy().equals(userId)) {
            return true;
        }

        // Rule 2: Assigned Access
        if (report.getAssignedUsers() != null && report.getAssignedUsers().contains(userId)) {
            return true;
        }

        return false;
    }

    public boolean canEdit(Authentication authentication, UUID reportId) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        UUID userId = userDetails.getUser().getId();

        ReportInstance report = reportRepository.findById(reportId).orElse(null);
        if (report == null) return false;

        // Rule 3: Locked after FINALIZED
        if ("FINALIZED".equals(report.getWorkflowStatus()) || "ARCHIVED".equals(report.getWorkflowStatus())) {
            return false;
        }

        // Rule 1: Owner Access
        if (report.getFilledBy().equals(userId)) {
            return true;
        }

        // Rule 2: Assigned Access
        if (report.getAssignedUsers() != null && report.getAssignedUsers().contains(userId)) {
            return true;
        }

        return false;
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_" + role) || a.getAuthority().equals(role) || a.getAuthority().equals("ROLE_" + role + "_NATIONAL") || a.getAuthority().equals("ROLE_" + role + "_REGIONAL") || a.getAuthority().equals("ROLE_" + role + "_LOCAL"));
    }
}
