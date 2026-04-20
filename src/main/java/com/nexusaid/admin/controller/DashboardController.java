package com.nexusaid.admin.controller;

import com.nexusaid.admin.repository.*;
import com.nexusaid.admin.client.CoreServiceFeignClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Dashboard KPI Aggregation Controller.
 * Provides endpoints that aggregate key performance indicators
 * from across MS3 (Reports, Donations, Templates) and MS1 (via
 * CoreServiceClient).
 *
 * Inter-service communication:
 * - GET /kpis (public) → aggregated counts from MS3 tables
 * - GET /my-context (authenticated) → calls MS1 to resolve user identity and
 * hierarchy
 */
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final TemplateRepository templateRepo;
    private final ReportInstanceRepository reportRepo;
    private final DonationNeedRepository needRepo;
    private final MonetaryDonationRepository monetaryRepo;
    private final InKindDonationRepository inKindRepo;
    private final MonthlyReportRepository monthlyReportRepo;
    private final CoreServiceFeignClient coreServiceClient;

    /**
     * Public KPIs — no authentication required.
     */
    @GetMapping("/kpis")
    public ResponseEntity<Map<String, Object>> getKpis() {
        Map<String, Object> kpis = new LinkedHashMap<>();

        // Templates & Reports
        kpis.put("totalTemplates", templateRepo.count());
        kpis.put("totalReports", reportRepo.count());
        kpis.put("totalMonthlyReports", monthlyReportRepo.count());

        // Donation Needs
        long activeNeeds = needRepo.findAll().stream()
                .filter(n -> n.getStatus() != null && n.getStatus().name().equals("ACTIVE"))
                .count();
        kpis.put("totalDonationNeeds", needRepo.count());
        kpis.put("activeDonationNeeds", activeNeeds);

        // Monetary Donations
        long monetaryCount = monetaryRepo.count();
        double monetaryTotal = monetaryRepo.findAll().stream()
                .mapToDouble(d -> d.getAmount() != null ? d.getAmount().doubleValue() : 0)
                .sum();
        kpis.put("totalMonetaryDonations", monetaryCount);
        kpis.put("totalMonetaryAmount", monetaryTotal);

        // In-Kind Donations
        kpis.put("totalInKindDonations", inKindRepo.count());

        return ResponseEntity.ok(kpis);
    }

    /**
     * Authenticated endpoint — calls MS1 to get the user's hierarchy and profile.
     * This is the inter-service bridge: MS3 Dashboard → MS1 Core Service.
     *
     * The JWT token is forwarded to MS1 so it can verify the user's identity
     * and return their committee hierarchy and role.
     */
    @GetMapping("/my-context")
    public ResponseEntity<Map<String, Object>> getMyContext(
            @RequestHeader("Authorization") String authHeader) {

        String token = authHeader.replace("Bearer ", "");
        Map<String, Object> context = new LinkedHashMap<>();

        try {
            String hierarchy = coreServiceClient.getHierarchyOverview(authHeader);
            context.put("hierarchy", hierarchy);
        } catch (Exception e) {
            log.warn("Could not fetch hierarchy from MS1: {}", e.getMessage());
            context.put("hierarchy", null);
            context.put("hierarchyError", "Core service unavailable");
        }

        try {
            String profile = coreServiceClient.getMyProfile(authHeader);
            context.put("profile", profile);
        } catch (Exception e) {
            log.warn("Could not fetch profile from MS1: {}", e.getMessage());
            context.put("profile", null);
            context.put("profileError", "Core service unavailable");
        }

        // Include MS3
        context.put("kpis", getKpis().getBody());

        return ResponseEntity.ok(context);
    }
}
