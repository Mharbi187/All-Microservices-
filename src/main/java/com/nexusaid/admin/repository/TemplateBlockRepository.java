package com.nexusaid.admin.repository;

import com.nexusaid.admin.entity.TemplateBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TemplateBlockRepository extends JpaRepository<TemplateBlock, UUID> {
    List<TemplateBlock> findByTemplateIdOrderByPositionOrderAsc(UUID templateId);
}
