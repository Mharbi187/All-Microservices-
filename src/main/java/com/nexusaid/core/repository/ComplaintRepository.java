package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Complaint;
import com.nexusaid.core.entity.enums.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, UUID> {
    List<Complaint> findByComplainantId(UUID complainantId);
    List<Complaint> findByStatus(ComplaintStatus status);
}
