package com.nexusaid.core.repository.donations;

import com.nexusaid.core.entity.donations.DonorNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonorNotificationRepository extends JpaRepository<DonorNotification, UUID> {
    List<DonorNotification> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserIdAndReadFalse(UUID userId);
}
