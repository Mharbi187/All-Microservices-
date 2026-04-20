package com.nexusaid.core.repository.domains.social;

import com.nexusaid.core.entity.domains.social.Family;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FamilyRepository extends JpaRepository<Family, UUID> {
    List<Family> findByStatus(String status);
}
