package com.nexusaid.core.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "volunteers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Volunteer extends User {

    private String matricule;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> skills;

    @Column(name = "date_adhesion")
    private LocalDate dateAdhesion;

    @Column(name = "hours_volunteered")
    private Double hoursVolunteered;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "training_progress", columnDefinition = "jsonb")
    private String trainingProgress;

    // Optional: committee_id to easily track which committee they belong to initially
    @Column(name = "committee_id")
    private java.util.UUID committeeId;

    @Column(name = "blood_type")
    private String bloodType;
}

