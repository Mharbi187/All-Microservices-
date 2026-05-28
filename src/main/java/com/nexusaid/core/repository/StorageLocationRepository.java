package com.nexusaid.core.repository;

import com.nexusaid.core.entity.StorageLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StorageLocationRepository extends JpaRepository<StorageLocation, UUID> {
    List<StorageLocation> findByCommitteeId(UUID committeeId);
}
