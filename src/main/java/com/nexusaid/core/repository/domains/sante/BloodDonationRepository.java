package com.nexusaid.core.repository.domains.sante;

import com.nexusaid.core.entity.domains.sante.BloodDonation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BloodDonationRepository extends JpaRepository<BloodDonation, UUID> {
    List<BloodDonation> findByDonorVolunteerId(UUID donorId);
    List<BloodDonation> findByBloodType(String bloodType);
}
