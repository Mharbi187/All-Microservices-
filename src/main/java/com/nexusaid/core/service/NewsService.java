package com.nexusaid.core.service;

import com.nexusaid.core.dto.NewsCreateDTO;
import com.nexusaid.core.dto.NewsDTO;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.NewsItem;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.NewsRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import com.nexusaid.core.entity.enums.RoleTitle;
import com.nexusaid.core.entity.enums.UserType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsRepository newsRepository;
    private final UserRepository userRepository;
    private final CommitteeRepository committeeRepository;
    private final VolunteerRepository volunteerRepository;
    private final CommitteeRoleRepository committeeRoleRepository;
    private final AuthService authService;

    /**
     * Returns only PUBLIE news — accessible without authentication (home page).
     */
    @Transactional(readOnly = true)
    public List<NewsDTO> getPublicNews() {
        return newsRepository.findPublishedNews()
                .stream()
                .map(news -> mapToDTOPublic(news))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NewsDTO> getVisibleNews(String category) {
        User currentUser = authService.getCurrentUser();
        UUID committeeId = null;

        if (currentUser.getType() == UserType.VOLUNTEER) {
            Volunteer volunteer = volunteerRepository.findById(currentUser.getId()).orElse(null);
            if (volunteer != null && volunteer.getCommitteeId() != null) {
                committeeId = volunteer.getCommitteeId();
            }
        }

        List<NewsItem> newsItems;
        if (committeeId != null) {
            newsItems = newsRepository.findVisibleNews(committeeId);
        } else {
            newsItems = newsRepository.findAllOrdered();
        }

        if (category != null && !category.trim().isEmpty()) {
            newsItems = newsItems.stream()
                    .filter(n -> category.equalsIgnoreCase(n.getCategory()))
                    .collect(Collectors.toList());
        }

        return newsItems.stream()
                .map(news -> mapToDTO(news, currentUser.getId()))
                .collect(Collectors.toList());
    }

    @Transactional
    public NewsDTO createNews(NewsCreateDTO createDTO) {
        User currentUser = authService.getCurrentUser();

        Committee committee = null;
        if (createDTO.getCommitteeId() != null) {
            committee = committeeRepository.findById(createDTO.getCommitteeId())
                    .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        }

        // Déterminer la portée hiérarchique
        CommitteeType scope = CommitteeType.LOCAL;
        if (createDTO.getTargetScope() != null) {
            try { scope = CommitteeType.valueOf(createDTO.getTargetScope()); } catch (Exception ignored) {}
        }

        // Vérifier si l'utilisateur est PRESIDENT, VICE_PRESIDENT ou ADMIN pour auto-publier directement sans validation
        boolean hasDirectPublishPrivilege = currentUser.getType() == UserType.ADMIN;
        if (!hasDirectPublishPrivilege) {
            hasDirectPublishPrivilege = committeeRoleRepository.findByVolunteerId(currentUser.getId())
                    .stream()
                    .anyMatch(r -> r.getTitle() == RoleTitle.PRESIDENT || r.getTitle() == RoleTitle.VICE_PRESIDENT);
        }

        // Les actualités NATIONAL ou créées par un Président/VP/Admin sont auto-publiées
        String status = (scope == CommitteeType.NATIONAL || hasDirectPublishPrivilege) ? "PUBLIE" : "EN_ATTENTE";

        NewsItem newsItem = NewsItem.builder()
                .title(createDTO.getTitle())
                .summary(createDTO.getSummary())
                .content(createDTO.getContent())
                .category(createDTO.getCategory() == null ? "NATIONAL" : createDTO.getCategory())
                .imageUrl(createDTO.getImageUrl())
                .author(currentUser)
                .committee(committee)
                .targetScope(scope)
                .status(status)
                .isPublic(createDTO.isPublic())
                .build();

        NewsItem saved = newsRepository.save(newsItem);
        return mapToDTO(saved, currentUser.getId());
    }

    @Transactional
    public NewsDTO toggleLike(UUID newsId) {
        User currentUser = authService.getCurrentUser();
        Volunteer volunteer = volunteerRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only volunteers can like news"));

        NewsItem newsItem = newsRepository.findById(newsId)
                .orElseThrow(() -> new IllegalArgumentException("News not found"));

        if (newsItem.getLikers().contains(volunteer)) {
            newsItem.getLikers().remove(volunteer);
        } else {
            newsItem.getLikers().add(volunteer);
        }

        NewsItem saved = newsRepository.save(newsItem);
        return mapToDTO(saved, currentUser.getId());
    }

    /**
     * Update news status: PUBLIE | REJETE | EN_ATTENTE
     * Called by presidents/VP to validate or reject submitted news.
     */
    @Transactional
    public NewsDTO updateNewsStatus(UUID newsId, String newStatus) {
        User currentUser = authService.getCurrentUser();
        NewsItem newsItem = newsRepository.findById(newsId)
                .orElseThrow(() -> new IllegalArgumentException("News not found"));

        // Validate status value
        if (!List.of("PUBLIE", "REJETE", "EN_ATTENTE").contains(newStatus)) {
            throw new IllegalArgumentException("Invalid status: " + newStatus);
        }

        newsItem.setStatus(newStatus);
        if ("PUBLIE".equals(newStatus)) {
            newsItem.setPublishedAt(java.time.OffsetDateTime.now());
        }
        NewsItem saved = newsRepository.save(newsItem);
        return mapToDTO(saved, currentUser.getId());
    }

    @Transactional
    public void deleteNews(UUID newsId) {
        newsRepository.deleteById(newsId);
    }

    /** Mapping sans utilisateur courant — pour endpoint public */
    private NewsDTO mapToDTOPublic(NewsItem entity) {
        NewsDTO dto = new NewsDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setSummary(entity.getSummary());
        dto.setContent(entity.getContent());
        dto.setCategory(entity.getCategory());
        dto.setAuthorName(entity.getAuthor().getFullName());
        dto.setCommitteeId(entity.getCommittee() != null ? entity.getCommittee().getId() : null);
        dto.setCommitteeName(entity.getCommittee() != null ? entity.getCommittee().getName() : null);
        dto.setImageUrl(entity.getImageUrl());
        dto.setPublishedAt(entity.getPublishedAt());
        dto.setLikesCount(entity.getLikers().size());
        dto.setTargetScope(entity.getTargetScope() != null ? entity.getTargetScope().name() : "NATIONAL");
        dto.setStatus(entity.getStatus());
        dto.setLiked(false);
        dto.setPublic(entity.isPublic());
        return dto;
    }

    private NewsDTO mapToDTO(NewsItem entity, UUID currentUserId) {
        NewsDTO dto = new NewsDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setSummary(entity.getSummary());
        dto.setContent(entity.getContent());
        dto.setCategory(entity.getCategory());
        dto.setAuthorName(entity.getAuthor().getFullName());
        dto.setCommitteeId(entity.getCommittee() != null ? entity.getCommittee().getId() : null);
        dto.setCommitteeName(entity.getCommittee() != null ? entity.getCommittee().getName() : null);
        dto.setImageUrl(entity.getImageUrl());
        dto.setPublishedAt(entity.getPublishedAt());
        dto.setLikesCount(entity.getLikers().size());
        dto.setTargetScope(entity.getTargetScope() != null ? entity.getTargetScope().name() : "LOCAL");
        dto.setStatus(entity.getStatus());
        dto.setPublic(entity.isPublic());

        boolean isLiked = entity.getLikers().stream()
                .anyMatch(v -> v.getId().equals(currentUserId));
        dto.setLiked(isLiked);

        return dto;
    }
}
