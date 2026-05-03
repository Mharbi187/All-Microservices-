package com.nexusaid.core.repository.domains.diffusion;

import com.nexusaid.core.entity.domains.diffusion.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface QuizRepository extends JpaRepository<Quiz, UUID> {
    
    @Query("SELECT q FROM Quiz q WHERE q.committee.id = :committeeId OR q.targetScope = 'NATIONAL' ORDER BY q.createdAt DESC")
    List<Quiz> findAllVisible(@Param("committeeId") UUID committeeId);

    @Query("SELECT q FROM Quiz q WHERE (q.committee.id = :committeeId OR q.targetScope = 'NATIONAL') AND q.status = 'PUBLISHED' ORDER BY q.createdAt DESC")
    List<Quiz> findPublishedVisible(@Param("committeeId") UUID committeeId);

    @Query("SELECT q FROM Quiz q ORDER BY q.createdAt DESC")
    List<Quiz> findAllOrdered();

    @Query("SELECT q FROM Quiz q WHERE q.status = 'PUBLISHED' ORDER BY q.createdAt DESC")
    List<Quiz> findAllPublishedOrdered();
}
