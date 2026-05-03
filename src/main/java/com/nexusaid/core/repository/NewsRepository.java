package com.nexusaid.core.repository;

import com.nexusaid.core.entity.NewsItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NewsRepository extends JpaRepository<NewsItem, UUID> {
    
    @Query("SELECT n FROM NewsItem n WHERE n.committee.id = :committeeId OR n.category = 'NATIONAL' ORDER BY n.publishedAt DESC")
    List<NewsItem> findVisibleNews(@Param("committeeId") UUID committeeId);

    @Query("SELECT n FROM NewsItem n ORDER BY n.publishedAt DESC")
    List<NewsItem> findAllOrdered();
}
