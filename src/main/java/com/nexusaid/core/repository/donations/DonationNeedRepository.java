package com.nexusaid.core.repository.donations;

import com.nexusaid.core.entity.donations.DonationNeed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonationNeedRepository extends JpaRepository<DonationNeed, UUID> {
    List<DonationNeed> findByStatusNot(String status);
    List<DonationNeed> findByCommitteeId(UUID committeeId);
}
