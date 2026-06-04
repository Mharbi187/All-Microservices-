package com.nexusaid.core.service.domains.vff;

import com.nexusaid.core.entity.domains.vff.ProtectionCampaign;
import com.nexusaid.core.entity.domains.vff.VictimCase;
import com.nexusaid.core.entity.domains.vff.VictimSupportPath;
import com.nexusaid.core.entity.domains.vff.Shelter;
import com.nexusaid.core.entity.domains.vff.Partner;
import com.nexusaid.core.repository.domains.vff.ProtectionCampaignRepository;
import com.nexusaid.core.repository.domains.vff.VictimCaseRepository;
import com.nexusaid.core.repository.domains.vff.VictimSupportPathRepository;
import com.nexusaid.core.repository.domains.vff.ShelterRepository;
import com.nexusaid.core.repository.domains.vff.PartnerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VffService {

    private final VictimCaseRepository victimCaseRepository;
    private final VictimSupportPathRepository supportPathRepository;
    private final ProtectionCampaignRepository campaignRepository;
    private final ShelterRepository shelterRepository;
    private final PartnerRepository partnerRepository;

    @Transactional
    public VictimCase reportVictimCase(VictimCase victimCase, UUID volunteerId) {
        victimCase.setAssignedVolunteerId(volunteerId);
        // Ensure a unique case reference is provided or generated securely here
        if (victimCase.getCaseReference() == null) {
            victimCase.setCaseReference("VFF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        return victimCaseRepository.save(victimCase);
    }

    @Transactional(readOnly = true)
    public List<VictimCase> getAllCases() {
        return victimCaseRepository.findAll();
    }

    @Transactional
    public VictimSupportPath initializeSupportPath(UUID caseId, VictimSupportPath supportPath) {
        // Only one active path per case
        Optional<VictimSupportPath> existing = supportPathRepository.findByVictimCaseId(caseId);
        if (existing.isPresent()) {
            throw new IllegalStateException("A support path already exists for this case.");
        }
        
        supportPath.setVictimCaseId(caseId);
        supportPath.setCurrentStage("REPORTED");
        return supportPathRepository.save(supportPath);
    }

    @Transactional
    public VictimSupportPath updateSupportPath(UUID caseId, VictimSupportPath updates) {
        VictimSupportPath existing = supportPathRepository.findByVictimCaseId(caseId)
                .orElseThrow(() -> new IllegalArgumentException("Support path not found for case"));
        
        if (updates.getMedicalFollowUp() != null) existing.setMedicalFollowUp(updates.getMedicalFollowUp());
        if (updates.getPsychologicalFollowUp() != null) existing.setPsychologicalFollowUp(updates.getPsychologicalFollowUp());
        if (updates.getLegalFollowUp() != null) existing.setLegalFollowUp(updates.getLegalFollowUp());
        if (updates.getShelterInfo() != null) existing.setShelterInfo(updates.getShelterInfo());
        if (updates.getCurrentStage() != null) existing.setCurrentStage(updates.getCurrentStage());
        
        existing.setPoliceReport(updates.isPoliceReport());
        if (updates.getCourtCaseRef() != null) existing.setCourtCaseRef(updates.getCourtCaseRef());
        
        return supportPathRepository.save(existing);
    }

    @Transactional(readOnly = true)
    public Optional<VictimSupportPath> getSupportPath(UUID caseId) {
        return supportPathRepository.findByVictimCaseId(caseId);
    }

    @Transactional
    public ProtectionCampaign launchCampaign(ProtectionCampaign campaign) {
        return campaignRepository.save(campaign);
    }

    @Transactional(readOnly = true)
    public List<ProtectionCampaign> getAllCampaigns() {
        return campaignRepository.findAll();
    }

    // ----- Shelters -----
    @Transactional
    public Shelter createShelter(Shelter shelter) {
        return shelterRepository.save(shelter);
    }

    @Transactional(readOnly = true)
    public List<Shelter> getAllShelters() {
        return shelterRepository.findAll();
    }

    // ----- Partners -----
    @Transactional
    public Partner createPartner(Partner partner) {
        return partnerRepository.save(partner);
    }

    @Transactional(readOnly = true)
    public List<Partner> getAllPartners() {
        return partnerRepository.findAll();
    }
}
