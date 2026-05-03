package com.nexusaid.core.repository.domains.diffusion;

import com.nexusaid.core.entity.domains.diffusion.QuizResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuizResultRepository extends JpaRepository<QuizResult, UUID> {
    List<QuizResult> findByQuizId(UUID quizId);
    List<QuizResult> findByVolunteerIdOrderBySubmittedAtDesc(UUID volunteerId);
    int countByQuizId(UUID quizId);
    int countByQuizIdAndPassedTrue(UUID quizId);
}
