package com.nexusaid.core.repository;

import com.nexusaid.core.entity.ComplaintResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ComplaintResponseRepository extends JpaRepository<ComplaintResponse, UUID> {
    List<ComplaintResponse> findByComplaintIdOrderByCreatedAtAsc(UUID complaintId);
}
