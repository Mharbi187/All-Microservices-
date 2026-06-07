package com.nexusaid.core.metrics;

import io.micrometer.core.instrument.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Custom Micrometer metrics for NexusAid Security, Audit, and Business events.
 *
 * Exposed at /actuator/prometheus for Prometheus scraping.
 * Used in Grafana dashboards: Security, API Gateway, RCP, Audit.
 */
@Slf4j
@Component
public class SecurityMetrics {

    // ─── Compteurs Auth ─────────────────────────────────────────────
    private final Counter loginSuccessCounter;
    private final Counter loginFailureCounter;
    private final Counter logoutCounter;
    private final Counter accountLockedCounter;
    private final Counter passwordResetCounter;
    private final Counter registrationCounter;

    // ─── Compteurs Sécurité ──────────────────────────────────────────
    private final Counter bruteForceCounter;
    private final Counter suspiciousIpCounter;
    private final Counter captchaTriggeredCounter;
    private final Counter tokenRefreshCounter;

    // ─── Compteurs Métier ────────────────────────────────────────────
    private final Counter pdfGeneratedCounter;
    private final Counter photoUploadedCounter;
    private final Counter rcpEvaluationsCounter;

    // ─── Gauges (valeurs instantanées) ──────────────────────────────
    private final AtomicInteger activeSessions       = new AtomicInteger(0);
    private final AtomicInteger riskScoreMax         = new AtomicInteger(0);
    private final AtomicInteger volunteersTotal      = new AtomicInteger(0);
    private final AtomicInteger committeesTotal      = new AtomicInteger(0);
    private final AtomicInteger trainersTotal        = new AtomicInteger(0);

    // ─── Histogrammes (scores) ───────────────────────────────────────
    private final DistributionSummary rcpAiScore;
    private final DistributionSummary rcpTrainerScore;

    public SecurityMetrics(MeterRegistry registry) {

        // ─── Auth counters ───────────────────────────────────────────
        this.loginSuccessCounter = Counter.builder("nexusaid.login.success.total")
                .description("Total des connexions réussies NexusAid")
                .tag("application", "nexusaid")
                .register(registry);

        this.loginFailureCounter = Counter.builder("nexusaid.login.failure.total")
                .description("Total des échecs de connexion NexusAid")
                .tag("application", "nexusaid")
                .register(registry);

        this.logoutCounter = Counter.builder("nexusaid.logout.total")
                .description("Total des déconnexions NexusAid")
                .tag("application", "nexusaid")
                .register(registry);

        this.accountLockedCounter = Counter.builder("nexusaid.accounts.locked.total")
                .description("Total des comptes verrouillés NexusAid")
                .tag("application", "nexusaid")
                .register(registry);

        this.passwordResetCounter = Counter.builder("nexusaid.password.reset.total")
                .description("Total des réinitialisations de mot de passe")
                .tag("application", "nexusaid")
                .register(registry);

        this.registrationCounter = Counter.builder("nexusaid.registration.total")
                .description("Total des inscriptions NexusAid")
                .tag("application", "nexusaid")
                .register(registry);

        // ─── Security counters ───────────────────────────────────────
        this.bruteForceCounter = Counter.builder("nexusaid.brute.force.detected.total")
                .description("Total des attaques bruteforce détectées")
                .tag("application", "nexusaid")
                .register(registry);

        this.suspiciousIpCounter = Counter.builder("nexusaid.suspicious.ip.total")
                .description("Total des IPs suspectes détectées")
                .tag("application", "nexusaid")
                .register(registry);

        this.captchaTriggeredCounter = Counter.builder("nexusaid.captcha.triggered.total")
                .description("Total des CAPTCHA déclenchés")
                .tag("application", "nexusaid")
                .register(registry);

        this.tokenRefreshCounter = Counter.builder("nexusaid.token.refresh.total")
                .description("Total des rafraîchissements de token JWT")
                .tag("application", "nexusaid")
                .register(registry);

        // ─── Business counters ───────────────────────────────────────
        this.pdfGeneratedCounter = Counter.builder("nexusaid.pdf.generated.total")
                .description("Total des PDFs générés")
                .tag("application", "nexusaid")
                .register(registry);

        this.photoUploadedCounter = Counter.builder("nexusaid.photo.uploaded.total")
                .description("Total des photos uploadées")
                .tag("application", "nexusaid")
                .register(registry);

        this.rcpEvaluationsCounter = Counter.builder("nexusaid.rcp.evaluations.total")
                .description("Total des évaluations RCP effectuées")
                .tag("application", "nexusaid")
                .register(registry);

        // ─── Gauges ──────────────────────────────────────────────────
        Gauge.builder("nexusaid.sessions.active", activeSessions, AtomicInteger::get)
                .description("Sessions utilisateur actives")
                .tag("application", "nexusaid")
                .register(registry);

        Gauge.builder("nexusaid.risk.score.max", riskScoreMax, AtomicInteger::get)
                .description("Score de risque maximum actuel (0-100)")
                .tag("application", "nexusaid")
                .register(registry);

        Gauge.builder("nexusaid.volunteers.total", volunteersTotal, AtomicInteger::get)
                .description("Nombre total de volontaires")
                .tag("application", "nexusaid")
                .register(registry);

        Gauge.builder("nexusaid.committees.total", committeesTotal, AtomicInteger::get)
                .description("Nombre total de comités")
                .tag("application", "nexusaid")
                .register(registry);

        Gauge.builder("nexusaid.trainers.total", trainersTotal, AtomicInteger::get)
                .description("Nombre total de formateurs")
                .tag("application", "nexusaid")
                .register(registry);

        // ─── Score distributions ──────────────────────────────────────
        this.rcpAiScore = DistributionSummary.builder("nexusaid.rcp.ai.score")
                .description("Distribution des scores IA pour les évaluations RCP")
                .baseUnit("points")
                .minimumExpectedValue(0.1)
                .maximumExpectedValue(20.0)
                .tag("application", "nexusaid")
                .register(registry);

        this.rcpTrainerScore = DistributionSummary.builder("nexusaid.rcp.trainer.score")
                .description("Distribution des scores formateurs pour les évaluations RCP")
                .baseUnit("points")
                .minimumExpectedValue(0.1)
                .maximumExpectedValue(20.0)
                .tag("application", "nexusaid")
                .register(registry);

        log.info("✅ SecurityMetrics Micrometer initialisées — NexusAid Monitoring");
    }

    // ─── AUTH METHODS ────────────────────────────────────────────────

    public void recordLoginSuccess() {
        loginSuccessCounter.increment();
        activeSessions.incrementAndGet();
    }

    public void recordLoginFailure() {
        loginFailureCounter.increment();
    }

    public void recordLogout() {
        logoutCounter.increment();
        int current = activeSessions.decrementAndGet();
        if (current < 0) activeSessions.set(0);
    }

    public void recordAccountLocked() {
        accountLockedCounter.increment();
    }

    public void recordPasswordReset() {
        passwordResetCounter.increment();
    }

    public void recordRegistration() {
        registrationCounter.increment();
    }

    // ─── SECURITY METHODS ────────────────────────────────────────────

    public void recordBruteForce() {
        bruteForceCounter.increment();
    }

    public void recordSuspiciousIp() {
        suspiciousIpCounter.increment();
    }

    public void recordCaptchaTriggered() {
        captchaTriggeredCounter.increment();
    }

    public void recordTokenRefresh() {
        tokenRefreshCounter.increment();
    }

    public void updateRiskScore(int score) {
        if (score > riskScoreMax.get()) {
            riskScoreMax.set(score);
        }
    }

    // ─── BUSINESS METHODS ────────────────────────────────────────────

    public void recordPdfGenerated() {
        pdfGeneratedCounter.increment();
    }

    public void recordPhotoUploaded() {
        photoUploadedCounter.increment();
    }

    public void recordRcpEvaluation() {
        rcpEvaluationsCounter.increment();
    }

    public void recordRcpAiScore(double score) {
        rcpAiScore.record(score);
    }

    public void recordRcpTrainerScore(double score) {
        rcpTrainerScore.record(score);
    }

    // ─── GAUGE SETTERS ───────────────────────────────────────────────

    public void setVolunteersTotal(int count) {
        volunteersTotal.set(count);
    }

    public void setCommitteesTotal(int count) {
        committeesTotal.set(count);
    }

    public void setTrainersTotal(int count) {
        trainersTotal.set(count);
    }
}
