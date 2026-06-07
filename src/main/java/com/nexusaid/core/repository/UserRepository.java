package com.nexusaid.core.repository;

import com.nexusaid.core.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByCin(String cin);

    @org.springframework.data.jpa.repository.Query("SELECT r.volunteer FROM CommitteeRole r WHERE r.committee.id = :committeeId AND r.title IN ('PRESIDENT', 'VICE_PRESIDENT')")
    java.util.List<User> findPresidentsAndVpsByCommittee(@org.springframework.data.repository.query.Param("committeeId") UUID committeeId);
}
