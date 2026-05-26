package com.nexusaid.core.repository.donations;

import com.nexusaid.core.entity.donations.DonationReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonationReceiptRepository extends JpaRepository<DonationReceipt, UUID> {
    List<DonationReceipt> findByDonationDonorIdOrderByCreatedAtDesc(UUID donorId);
}
