package com.nexusaid.core.controller;

import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/badges")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;
    private final VolunteerRepository volunteerRepo;

    @GetMapping
    public ResponseEntity<?> listBadges() {
        return ResponseEntity.ok(java.util.List.of(
                java.util.Map.of("type", "VOLUNTEER_QR", "description", "QR Badge for Volunteers",
                        "generateUrl", "/api/v1/badges/volunteer/{volunteerId}/qr")));
    }

    @GetMapping("/volunteer/{volunteerId}/qr")
    public ResponseEntity<byte[]> generateVolunteerBadge(@PathVariable UUID volunteerId) {
        Volunteer volunteer = volunteerRepo.findById(volunteerId)
                .orElseThrow(() -> new RuntimeException("Volunteer not found"));

        byte[] qrImage = badgeService.generateBadgeQrCode(
                volunteerId,
                volunteer.getFullName(),
                volunteer.getMatricule(),
                volunteer.getCommitteeId() != null ? volunteer.getCommitteeId().toString() : "N/A");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.IMAGE_PNG);
        headers.setContentDispositionFormData("inline", "badge_" + volunteerId + ".png");

        return new ResponseEntity<>(qrImage, headers, HttpStatus.OK);
    }
}
