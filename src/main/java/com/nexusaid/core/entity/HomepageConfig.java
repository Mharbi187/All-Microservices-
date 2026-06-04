package com.nexusaid.core.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "homepage_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomepageConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String headline1;

    @Column(nullable = false)
    private String headline2;

    @Column(nullable = false)
    private String headlineAccent;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String subtitle;

    @Column(nullable = false)
    private String ctaLabel;

    @Column(nullable = false)
    private String badge1Icon;

    @Column(nullable = false)
    private String badge1Title;

    @Column(nullable = false)
    private String badge1Sub;

    @Column(nullable = false)
    private String badge2Icon;

    @Column(nullable = false)
    private String badge2Title;

    @Column(nullable = false)
    private String badge2Sub;

    @Column(nullable = false)
    private String stat1n;

    @Column(nullable = false)
    private String stat1label;

    @Column(nullable = false)
    private String stat2n;

    @Column(nullable = false)
    private String stat2label;

    @Column(nullable = false)
    private String stat3n;

    @Column(nullable = false)
    private String stat3label;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String heroImage;
}
