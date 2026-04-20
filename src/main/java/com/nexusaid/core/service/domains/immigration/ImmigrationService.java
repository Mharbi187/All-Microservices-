package com.nexusaid.core.service.domains.immigration;

import com.nexusaid.core.entity.domains.immigration.FamilyLinkCase;
import com.nexusaid.core.entity.domains.immigration.IntegrationTracking;
import com.nexusaid.core.entity.domains.immigration.MigrantCase;
import com.nexusaid.core.repository.domains.immigration.FamilyLinkCaseRepository;
import com.nexusaid.core.repository.domains.immigration.IntegrationTrackingRepository;
import com.nexusaid.core.repository.domains.immigration.MigrantCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ImmigrationService {

    private final MigrantCaseRepository migrantCaseRepository;
    private final FamilyLinkCaseRepository familyLinkRepository;
    private final IntegrationTrackingRepository trackingRepository;

    @Transactional
    public MigrantCase registerMigrantCase(MigrantCase migrantCase, UUID volunteerId) {
        migrantCase.setAssignedVolunteerId(volunteerId);
        if (migrantCase.getCurrentStatus() == null) {
            migrantCase.setCurrentStatus("ACTIVE");
        }
        return migrantCaseRepository.save(migrantCase);
    }

    @Transactional(readOnly = true)
    public List<MigrantCase> getAllMigrantCases() {
        return migrantCaseRepository.findAll();
    }

    @Transactional
    public FamilyLinkCase openFamilyLinkCase(FamilyLinkCase linkCase, UUID requesterId) {
        linkCase.setRequesterId(requesterId);
        linkCase.setStatus("OPEN");
        return familyLinkRepository.save(linkCase);
    }

    @Transactional(readOnly = true)
    public List<FamilyLinkCase> getAllFamilyLinkCases() {
        return familyLinkRepository.findAll();
    }

    @Transactional
    public FamilyLinkCase resolveFamilyLinkCase(UUID caseId, String resolutionNotes) {
        return familyLinkRepository.findById(caseId).map(c -> {
            c.setStatus("RESOLVED");
            c.setNotes(c.getNotes() + "\nResolution: " + resolutionNotes);
            c.setResolvedAt(LocalDateTime.now());
            return familyLinkRepository.save(c);
        }).orElseThrow(() -> new IllegalArgumentException("Family Link Case not found"));
    }

    @Transactional
    public IntegrationTracking updateTracking(UUID migrantCaseId, IntegrationTracking tracking) {
        // If one exists, update it. If not, create it.
        Optional<IntegrationTracking> existing = trackingRepository.findByMigrantCaseId(migrantCaseId);
        if (existing.isPresent()) {
            IntegrationTracking t = existing.get();
            t.setLanguageCourseEnrolled(tracking.isLanguageCourseEnrolled());
            t.setLanguageLevel(tracking.getLanguageLevel());
            t.setLegalAssistanceProvided(tracking.isLegalAssistanceProvided());
            t.setSocialInsertion(tracking.getSocialInsertion());
            if (tracking.getMilestones() != null) {
                t.setMilestones(tracking.getMilestones());
            }
            return trackingRepository.save(t);
        } else {
            tracking.setMigrantCaseId(migrantCaseId);
            return trackingRepository.save(tracking);
        }
    }

    @Transactional(readOnly = true)
    public Optional<IntegrationTracking> getTracking(UUID migrantCaseId) {
        return trackingRepository.findByMigrantCaseId(migrantCaseId);
    }
}
