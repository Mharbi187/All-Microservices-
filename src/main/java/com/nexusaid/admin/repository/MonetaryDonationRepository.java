package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.MonetaryDonation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MonetaryDonationRepository extends JpaRepository<MonetaryDonation, UUID> {
    List<MonetaryDonation> findByDonorId(UUID donorId);

    List<MonetaryDonation> findByNeedId(UUID needId);
}
