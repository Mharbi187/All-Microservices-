package com.nexusaid.core.service.domains.sante;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.domains.sante.*;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.domains.sante.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SanteService {

    private final HealthActionRepository healthActionRepository;
    private final BloodDonationRepository bloodDonationRepository;
    private final BeneficiaryHealthFileRepository beneficiaryRepo;
    private final ActionChiefRepository actionChiefRepository;
    private final CommitteeRepository committeeRepository;
    private final MedicalDistributionRepository medicalDistributionRepository;

    // ---- Health Actions ----

    @Transactional
    public HealthAction createAction(UUID committeeId, HealthAction action) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        action.setCommittee(committee);
        if (action.getStatus() == null) action.setStatus("PLANNED");
        return healthActionRepository.save(action);
    }

    @Transactional(readOnly = true)
    public List<HealthAction> getActionsForCommittee(UUID committeeId) {
        return healthActionRepository.findByCommitteeId(committeeId);
    }

    // ---- Blood Donations ----

    @Transactional
    public BloodDonation recordBloodDonation(BloodDonation donation) {
        return bloodDonationRepository.save(donation);
    }

    @Transactional(readOnly = true)
    public List<BloodDonation> getAllBloodDonations() {
        return bloodDonationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<BloodDonation> getBloodDonationsByCommittee(UUID committeeId) {
        return bloodDonationRepository.findByCommitteeIdOrderByDonationDateDesc(committeeId);
    }

    // ---- Beneficiary Health Files ----

    @Transactional
    public BeneficiaryHealthFile addHealthFile(BeneficiaryHealthFile file) {
        return beneficiaryRepo.save(file);
    }

    @Transactional(readOnly = true)
    public List<BeneficiaryHealthFile> getHealthFilesForIntervention(UUID interventionId) {
        return beneficiaryRepo.findByInterventionId(interventionId);
    }

    // ---- Action Chiefs ----

    @Transactional
    public ActionChief assignActionChief(ActionChief chief, UUID designatedBy) {
        chief.setDesignatedBy(designatedBy);
        chief.setStatus("ACTIVE");
        return actionChiefRepository.save(chief);
    }

    // ---- Medical Distributions ----

    @Transactional
    public MedicalDistribution createDistribution(MedicalDistribution distribution) {
        distribution.setStatus("PENDING");
        distribution.setRequestedAt(LocalDateTime.now());
        return medicalDistributionRepository.save(distribution);
    }

    @Transactional(readOnly = true)
    public List<MedicalDistribution> getDistributionsByCommittee(UUID committeeId) {
        return medicalDistributionRepository.findByCommitteeIdOrderByRequestedAtDesc(committeeId);
    }

    @Transactional(readOnly = true)
    public List<MedicalDistribution> getAllDistributions() {
        return medicalDistributionRepository.findAllByOrderByRequestedAtDesc();
    }

    @Transactional(readOnly = true)
    public List<MedicalDistribution> getPendingDistributions() {
        return medicalDistributionRepository.findByStatusOrderByRequestedAtDesc("PENDING");
    }

    @Transactional
    public MedicalDistribution approveDistribution(UUID distributionId, UUID approvedById, String approvedByName) {
        MedicalDistribution dist = medicalDistributionRepository.findById(distributionId)
                .orElseThrow(() -> new IllegalArgumentException("Distribution not found"));
        dist.setStatus("APPROVED");
        dist.setApprovedBy(approvedById);
        dist.setApprovedByName(approvedByName);
        dist.setApprovedAt(LocalDateTime.now());
        return medicalDistributionRepository.save(dist);
    }

    @Transactional
    public MedicalDistribution rejectDistribution(UUID distributionId, String reason) {
        MedicalDistribution dist = medicalDistributionRepository.findById(distributionId)
                .orElseThrow(() -> new IllegalArgumentException("Distribution not found"));
        dist.setStatus("REJECTED");
        dist.setRejectionReason(reason);
        return medicalDistributionRepository.save(dist);
    }

    @Transactional
    public MedicalDistribution markDistributed(UUID distributionId) {
        MedicalDistribution dist = medicalDistributionRepository.findById(distributionId)
                .orElseThrow(() -> new IllegalArgumentException("Distribution not found"));
        dist.setStatus("DISTRIBUTED");
        return medicalDistributionRepository.save(dist);
    }
}
