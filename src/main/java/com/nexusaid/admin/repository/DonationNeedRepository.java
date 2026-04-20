package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.DonationNeed;
import com.nexusaid.admin.entity.enums.NeedsStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonationNeedRepository extends JpaRepository<DonationNeed, UUID> {
    List<DonationNeed> findByStatus(NeedsStatus status);

    List<DonationNeed> findByCommitteeIdAndStatus(UUID committeeId, NeedsStatus status);
}
