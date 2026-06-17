package com.nexusaid.core.repository.domains.diffusion;

import com.nexusaid.core.entity.domains.diffusion.EducationalResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EducationalResourceRepository extends JpaRepository<EducationalResource, UUID> {
    List<EducationalResource> findByCreatedBy(UUID creatorId);
    List<EducationalResource> findByCategory(String category);
}
