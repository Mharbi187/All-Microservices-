package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.Template;
import com.nexusaid.admin.entity.enums.TemplateScope;
import com.nexusaid.admin.entity.enums.VisibilityScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TemplateRepository extends JpaRepository<Template, UUID> {

    // Legacy queries (backward compat)
    List<Template> findByCreatedByAndIsActiveTrue(UUID createdBy);
    List<Template> findByIsActiveTrue();
    List<Template> findByVisibilityScopeAndIsActiveTrue(VisibilityScope scope);

    // v2 scope queries
    List<Template> findByScopeAndIsActiveTrue(TemplateScope scope);
    List<Template> findByIsBaseTemplateTrueAndIsActiveTrue();
    List<Template> findByParentTemplateIdAndIsActiveTrue(UUID parentTemplateId);
}
