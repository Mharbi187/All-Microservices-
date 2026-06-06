package com.nexusaid.core.repository.domains.catastrophe;

import com.nexusaid.core.entity.domains.catastrophe.DisasterMission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DisasterMissionRepository extends JpaRepository<DisasterMission, UUID> {

    List<DisasterMission> findByCommitteeId(UUID committeeId);

    List<DisasterMission> findByStatus(String status);

    List<DisasterMission> findByCommitteeIdAndStatus(UUID committeeId, String status);

    @Query("SELECT m FROM DisasterMission m WHERE m.committee.id IN :committeeIds ORDER BY m.createdAt DESC")
    List<DisasterMission> findByCommitteeIdIn(List<UUID> committeeIds);

    @Query("SELECT m FROM DisasterMission m ORDER BY m.createdAt DESC")
    List<DisasterMission> findAllOrderByCreatedAtDesc();

    @Query(value = "SELECT * FROM disaster_missions m WHERE m.team_chief_id = :volunteerId OR CAST(m.assigned_volunteers AS text) LIKE CONCAT('%', :volunteerIdStr, '%') ORDER BY m.created_at DESC", nativeQuery = true)
    List<DisasterMission> findMissionsByVolunteerIdNative(@org.springframework.data.repository.query.Param("volunteerId") UUID volunteerId, @org.springframework.data.repository.query.Param("volunteerIdStr") String volunteerIdStr);
}
