package com.nexusaid.core.repository.domains.jeunesse;

import com.nexusaid.core.entity.domains.jeunesse.YouthRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface YouthRecommendationRepository extends JpaRepository<YouthRecommendation, UUID> {
    Optional<YouthRecommendation> findByFormId(UUID formId);
    List<YouthRecommendation> findByCommitteeIdIn(List<UUID> committeeIds);
    List<YouthRecommendation> findByCommitteeIdInAndStatus(List<UUID> committeeIds, String status);
    List<YouthRecommendation> findByCommitteeIdAndStatus(UUID committeeId, String status);
    List<YouthRecommendation> findByFormIdIsNull();
}
