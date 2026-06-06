package com.nexusaid.core.repository;

import com.nexusaid.core.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    
    @Query("SELECT c FROM CalendarEvent c WHERE ((c.committee.id = :committeeId) " +
           "OR c.targetScope = com.nexusaid.core.entity.enums.CommitteeType.NATIONAL " +
           "OR (c.targetScope = com.nexusaid.core.entity.enums.CommitteeType.REGIONAL AND c.committee.region = (SELECT co.region FROM Committee co WHERE co.id = :committeeId)) " +
           "OR c.committee IS NULL) AND c.endDate >= :now ORDER BY c.startDate ASC")
    List<CalendarEvent> findUpcomingEvents(@Param("committeeId") UUID committeeId, @Param("now") OffsetDateTime now);

    @Query("SELECT c FROM CalendarEvent c ORDER BY c.startDate DESC")
    List<CalendarEvent> findAllOrdered();
}
