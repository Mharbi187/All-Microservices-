package com.nexusaid.core.repository;

import com.nexusaid.core.entity.SecourismeCertification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SecourismeCertificationRepository extends JpaRepository<SecourismeCertification, UUID> {
    List<SecourismeCertification> findByActiveTrue();
    Optional<SecourismeCertification> findByCode(String code);
    List<SecourismeCertification> findByActiveTrueOrderByLevel();
}
