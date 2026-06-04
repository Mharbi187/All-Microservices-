package com.nexusaid.core.controller;

import com.nexusaid.core.entity.HomepageConfig;
import com.nexusaid.core.repository.HomepageConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/homepage/config")
@RequiredArgsConstructor
public class HomepageConfigController {

    private final HomepageConfigRepository homepageConfigRepository;

    @GetMapping
    public ResponseEntity<HomepageConfig> getConfig() {
        HomepageConfig config = homepageConfigRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> {
                    HomepageConfig defaultConfig = HomepageConfig.builder()
                            .headline1("Gérez Vos")
                            .headline2("Opérations")
                            .headlineAccent("Humanitaires")
                            .subtitle("Découvrez la plateforme intégrée Nexus-AID pour la gestion des dons, volontaires et interventions du Croissant-Rouge Tunisien.")
                            .ctaLabel("Voir nos modules")
                            .badge1Icon("heartbeat")
                            .badge1Title("Formation PSE1")
                            .badge1Sub("En cours • 3 équipes")
                            .badge2Icon("alert")
                            .badge2Title("12 alertes actives")
                            .badge2Sub("Mise à jour en direct")
                            .stat1n("2 841")
                            .stat1label("Volontaires actifs")
                            .stat2n("24/7")
                            .stat2label("Disponibilité")
                            .stat3n("89")
                            .stat3label("Comités actifs")
                            .heroImage("/hero-volunteers.png")
                            .build();
                    return homepageConfigRepository.save(defaultConfig);
                });
        return ResponseEntity.ok(config);
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('PRESIDENT_NATIONAL', 'RESP_DIFFUSION_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'SECRETAIRE_GENERAL_NATIONAL')")
    public ResponseEntity<HomepageConfig> updateConfig(@RequestBody HomepageConfig newConfig) {
        HomepageConfig existing = homepageConfigRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> HomepageConfig.builder().build());

        existing.setHeadline1(newConfig.getHeadline1());
        existing.setHeadline2(newConfig.getHeadline2());
        existing.setHeadlineAccent(newConfig.getHeadlineAccent());
        existing.setSubtitle(newConfig.getSubtitle());
        existing.setCtaLabel(newConfig.getCtaLabel());
        existing.setBadge1Icon(newConfig.getBadge1Icon());
        existing.setBadge1Title(newConfig.getBadge1Title());
        existing.setBadge1Sub(newConfig.getBadge1Sub());
        existing.setBadge2Icon(newConfig.getBadge2Icon());
        existing.setBadge2Title(newConfig.getBadge2Title());
        existing.setBadge2Sub(newConfig.getBadge2Sub());
        existing.setStat1n(newConfig.getStat1n());
        existing.setStat1label(newConfig.getStat1label());
        existing.setStat2n(newConfig.getStat2n());
        existing.setStat2label(newConfig.getStat2label());
        existing.setStat3n(newConfig.getStat3n());
        existing.setStat3label(newConfig.getStat3label());
        existing.setHeroImage(newConfig.getHeroImage());

        return ResponseEntity.ok(homepageConfigRepository.save(existing));
    }
}
