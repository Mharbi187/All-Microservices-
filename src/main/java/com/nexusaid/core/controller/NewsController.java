package com.nexusaid.core.controller;

import com.nexusaid.core.dto.NewsCreateDTO;
import com.nexusaid.core.dto.NewsDTO;
import com.nexusaid.core.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    /** Public endpoint — no authentication required — returns only PUBLIE news for home page */
    @GetMapping("/public")
    public ResponseEntity<List<NewsDTO>> getPublicNews() {
        return ResponseEntity.ok(newsService.getPublicNews());
    }

    /** Authenticated endpoint — returns news visible to the current user */
    @GetMapping
    public ResponseEntity<List<NewsDTO>> getNews(@RequestParam(required = false) String category) {
        return ResponseEntity.ok(newsService.getVisibleNews(category));
    }

    @PostMapping
    public ResponseEntity<NewsDTO> createNews(@RequestBody NewsCreateDTO createDTO) {
        return ResponseEntity.ok(newsService.createNews(createDTO));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<NewsDTO> toggleLike(@PathVariable UUID id) {
        return ResponseEntity.ok(newsService.toggleLike(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNews(@PathVariable UUID id) {
        newsService.deleteNews(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Validation workflow: President / VP approuve ou rejette une actualité.
     * Status: PUBLIE | REJETE | EN_ATTENTE
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'SECRETAIRE_GENERAL', 'ADMIN')")
    public ResponseEntity<NewsDTO> updateNewsStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload) {
        String status = payload.get("status");
        return ResponseEntity.ok(newsService.updateNewsStatus(id, status));
    }
}
