package com.nexusaid.core.repository.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.YouthFormTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface YouthFormTemplateRepository extends JpaRepository<YouthFormTemplate, UUID> {
}
