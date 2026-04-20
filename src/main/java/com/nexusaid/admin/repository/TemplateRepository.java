package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.Template;
import com.nexusaid.admin.entity.enums.VisibilityScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {

    // For fetching templates a user created
    List<Template> findByCreatedByAndIsActiveTrue(UUID createdBy);

    // For fetching active templates globally (e.g., Secrétaire Général)
    List<Template> findByIsActiveTrue();

    // For fetching templates by visibility scope
    List<Template> findByVisibilityScopeAndIsActiveTrue(VisibilityScope scope);
}
