package com.nexusaid.core.repository;

import com.nexusaid.core.entity.HomepageConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HomepageConfigRepository extends JpaRepository<HomepageConfig, Long> {
    Optional<HomepageConfig> findFirstByOrderByIdAsc();
}
