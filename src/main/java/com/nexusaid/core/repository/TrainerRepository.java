package com.nexusaid.core.repository;

import com.nexusaid.core.entity.Trainer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface TrainerRepository extends JpaRepository<Trainer, UUID> {
}
