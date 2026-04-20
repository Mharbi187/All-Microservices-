package com.nexusaid.core.service.domains.sante;

import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.domains.sante.ActionChief;
import com.nexusaid.core.entity.domains.sante.BeneficiaryHealthFile;
import com.nexusaid.core.entity.domains.sante.BloodDonation;
import com.nexusaid.core.entity.domains.sante.HealthAction;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.domains.sante.ActionChiefRepository;
import com.nexusaid.core.repository.domains.sante.BeneficiaryHealthFileRepository;
import com.nexusaid.core.repository.domains.sante.BloodDonationRepository;
import com.nexusaid.core.repository.domains.sante.HealthActionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public HealthAction createAction(UUID committeeId, HealthAction action) {
        Committee committee = committeeRepository.findById(committeeId)
                .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        action.setCommittee(committee);
        action.setStatus("PLANNED");
        return healthActionRepository.save(action);
    }

    @Transactional(readOnly = true)
    public List<HealthAction> getActionsForCommittee(UUID committeeId) {
        return healthActionRepository.findByCommitteeId(committeeId);
    }

    @Transactional
    public BloodDonation recordBloodDonation(BloodDonation donation) {
        return bloodDonationRepository.save(donation);
    }

    @Transactional(readOnly = true)
    public List<BloodDonation> getAllBloodDonations() {
        return bloodDonationRepository.findAll();
    }

    @Transactional
    public BeneficiaryHealthFile addHealthFile(BeneficiaryHealthFile file) {
        return beneficiaryRepo.save(file);
    }

    @Transactional(readOnly = true)
    public List<BeneficiaryHealthFile> getHealthFilesForIntervention(UUID interventionId) {
        return beneficiaryRepo.findByInterventionId(interventionId);
    }

    @Transactional
    public ActionChief assignActionChief(ActionChief chief, UUID designatedBy) {
        chief.setDesignatedBy(designatedBy);
        chief.setStatus("ACTIVE");
        return actionChiefRepository.save(chief);
    }
}
