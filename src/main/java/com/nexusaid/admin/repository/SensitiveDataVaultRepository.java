package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.SensitiveDataVault;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SensitiveDataVaultRepository extends JpaRepository<SensitiveDataVault, UUID> {
    List<SensitiveDataVault> findByReportId(UUID reportId);

    Optional<SensitiveDataVault> findByReportIdAndTemplateBlockId(UUID reportId, UUID templateBlockId);
}
