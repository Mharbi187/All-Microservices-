package com.nexusaid.core.repository.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.YouthDomainOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface YouthDomainOptionRepository extends JpaRepository<YouthDomainOption, UUID> {
    List<YouthDomainOption> findByType(String type);
}
