package com.nexusaid.core.repository.donations;

import com.nexusaid.core.entity.donations.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DonationRepository extends JpaRepository<Donation, UUID> {
    List<Donation> findByDonorIdOrderByCreatedAtDesc(UUID donorId);
    List<Donation> findByNeedCommitteeIdOrderByCreatedAtDesc(UUID committeeId);
    Optional<Donation> findByDonationNumber(String donationNumber);
}
