package com.nexusaid.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "trainers")
public class Trainer extends Volunteer {

    @Column(name = "expertise_domains", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String expertiseDomains;

    @Column(name = "audit_history", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String auditHistory;
}
