package com.nexusaid.core.repository.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.YouthFormResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface YouthFormResponseRepository extends JpaRepository<YouthFormResponse, UUID> {
    List<YouthFormResponse> findByIdFormTemplate(UUID idFormTemplate);
}
