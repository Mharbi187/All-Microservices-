package com.nexusaid.core.repository;

import com.nexusaid.core.entity.NewsItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NewsRepository extends JpaRepository<NewsItem, UUID> {
    
    @Query("SELECT n FROM NewsItem n WHERE n.committee.id = :committeeId " +
           "OR n.targetScope = com.nexusaid.core.entity.enums.CommitteeType.NATIONAL " +
           "OR (n.targetScope = com.nexusaid.core.entity.enums.CommitteeType.REGIONAL AND n.committee.region = (SELECT c.region FROM Committee c WHERE c.id = :committeeId)) " +
           "ORDER BY n.publishedAt DESC")
    List<NewsItem> findVisibleNews(@Param("committeeId") UUID committeeId);

    @Query("SELECT n FROM NewsItem n ORDER BY n.publishedAt DESC")
    List<NewsItem> findAllOrdered();

    /** Public endpoint: returns only published news ordered by date */
    @Query("SELECT n FROM NewsItem n WHERE n.status = 'PUBLIE' AND n.isPublic = true ORDER BY n.publishedAt DESC")
    List<NewsItem> findPublishedNews();

    /** News pending validation for a specific committee (for president dashboard) */
    @Query("SELECT n FROM NewsItem n WHERE n.committee.id = :committeeId AND n.status = 'EN_ATTENTE' ORDER BY n.createdAt DESC")
    List<NewsItem> findPendingByCommittee(@Param("committeeId") UUID committeeId);
}
