package com.nexusaid.core.service;

import com.nexusaid.core.dto.DonationDtos.DonorNotificationDto;
import com.nexusaid.core.entity.donations.DonorNotification;
import com.nexusaid.core.repository.donations.DonorNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final DonorNotificationRepository repository;

    public List<DonorNotificationDto> getMyNotifications(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public long getUnreadCount(UUID userId) {
        return repository.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        DonorNotification notif = repository.findById(notificationId).orElse(null);
        if (notif != null && notif.getUser().getId().equals(userId)) {
            notif.setRead(true);
            repository.save(notif);
        }
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<DonorNotification> notifs = repository.findByUserIdOrderByCreatedAtDesc(userId);
        notifs.forEach(n -> n.setRead(true));
        repository.saveAll(notifs);
    }

    private DonorNotificationDto mapToDto(DonorNotification n) {
        DonorNotificationDto dto = new DonorNotificationDto();
        dto.setId(n.getId());
        dto.setType(n.getType());
        dto.setTitle(n.getTitle());
        dto.setMessage(n.getMessage());
        dto.setRead(n.isRead());
        dto.setLink(n.getLink());
        dto.setMetadata(n.getMetadata());
        dto.setCreatedAt(n.getCreatedAt());
        return dto;
    }
}
