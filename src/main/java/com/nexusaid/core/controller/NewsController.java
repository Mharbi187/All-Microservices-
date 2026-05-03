package com.nexusaid.core.controller;

import com.nexusaid.core.dto.NewsCreateDTO;
import com.nexusaid.core.dto.NewsDTO;
import com.nexusaid.core.service.NewsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping
    public ResponseEntity<List<NewsDTO>> getNews() {
        return ResponseEntity.ok(newsService.getVisibleNews());
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
}
