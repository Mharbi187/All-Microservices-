package com.nexusaid.core.controller;

import com.nexusaid.core.dto.DonationDtos.DonorNotificationDto;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DonorNotificationDto>> getMyNotifications(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        return ResponseEntity.ok(notificationService.getMyNotifications(userDetails.getUser().getId()));
    }

    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        Map<String, Long> response = new HashMap<>();
        response.put("count", notificationService.getUnreadCount(userDetails.getUser().getId()));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.markAsRead(id, userDetails.getUser().getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        notificationService.markAllAsRead(userDetails.getUser().getId());
        return ResponseEntity.ok().build();
    }
}
