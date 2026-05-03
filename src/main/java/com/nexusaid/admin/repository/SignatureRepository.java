package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.Signature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SignatureRepository extends JpaRepository<Signature, UUID> {

    List<Signature> findByReportId(UUID reportId);

    Optional<Signature> findByReportIdAndUserId(UUID reportId, UUID userId);

    boolean existsByReportIdAndUserId(UUID reportId, UUID userId);

    int countByReportId(UUID reportId);
}
