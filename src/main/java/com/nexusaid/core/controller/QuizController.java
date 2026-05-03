package com.nexusaid.core.controller;

import com.nexusaid.core.dto.QuizDTOs.*;
import com.nexusaid.core.service.domains.diffusion.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping
    public ResponseEntity<List<QuizDTO>> getQuizzes(@RequestParam(required = false) UUID committeeId) {
        return ResponseEntity.ok(quizService.getQuizzes(committeeId));
    }

    @GetMapping("/published")
    public ResponseEntity<List<QuizDTO>> getPublishedQuizzes(@RequestParam(required = false) UUID committeeId) {
        return ResponseEntity.ok(quizService.getPublishedQuizzes(committeeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuizDTO> getQuizById(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.getQuizById(id));
    }

    @PostMapping
    public ResponseEntity<QuizDTO> createQuiz(@RequestBody QuizCreateDTO createDTO) {
        return ResponseEntity.ok(quizService.createQuiz(createDTO));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<QuizDTO> publishQuiz(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.publishQuiz(id));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<Void> archiveQuiz(@PathVariable UUID id) {
        quizService.archiveQuiz(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuiz(@PathVariable UUID id) {
        quizService.deleteQuiz(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/submit")
    public ResponseEntity<QuizResultDTO> submitQuiz(@RequestBody QuizSubmitDTO submitDTO) {
        return ResponseEntity.ok(quizService.submitQuiz(submitDTO));
    }

    @GetMapping("/my-results")
    public ResponseEntity<List<QuizResultDTO>> getMyResults() {
        return ResponseEntity.ok(quizService.getMyResults());
    }

    @GetMapping("/{id}/results")
    public ResponseEntity<List<QuizResultDTO>> getQuizResults(@PathVariable UUID id) {
        return ResponseEntity.ok(quizService.getQuizResults(id));
    }
}
