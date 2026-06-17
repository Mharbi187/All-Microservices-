package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.InKindDonation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InKindDonationRepository extends JpaRepository<InKindDonation, UUID> {
    List<InKindDonation> findByDonorId(UUID donorId);

    List<InKindDonation> findByNeedId(UUID needId);
}
