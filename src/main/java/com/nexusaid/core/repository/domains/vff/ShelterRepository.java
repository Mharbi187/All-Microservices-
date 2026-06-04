package com.nexusaid.core.repository.domains.vff;

import com.nexusaid.core.entity.domains.vff.Shelter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ShelterRepository extends JpaRepository<Shelter, UUID> {
}
