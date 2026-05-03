package com.nexusaid.core.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class QuizDTOs {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizQuestionDTO {
        private UUID id;
        private String text;
        private String type;
        private List<String> options;
        private List<Integer> correctAnswers;
        private Integer points;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizDTO {
        private UUID id;
        private String title;
        private String description;
        private String category;
        private Integer minScore;
        private Integer timeLimit;
        private List<QuizQuestionDTO> questions;
        private String badgeTitle;
        private String badgeColor;
        private UUID committeeId;
        private String committeeName;
        private String createdByName;
        private OffsetDateTime createdAt;
        private String status;
        private String targetScope;
        private Integer totalParticipants;
        private Double passRate;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizCreateDTO {
        private String title;
        private String description;
        private String category;
        private Integer minScore;
        private Integer timeLimit;
        private List<QuizQuestionDTO> questions;
        private String badgeTitle;
        private String badgeColor;
        private UUID committeeId;
        private String targetScope;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizAnswerDTO {
        private Integer questionIndex;
        private List<Integer> selectedAnswers;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizSubmitDTO {
        private UUID quizId;
        private List<QuizAnswerDTO> answers;
        private Integer timeTaken;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizResultDTO {
        private UUID id;
        private UUID quizId;
        private String quizTitle;
        private UUID volunteerId;
        private String volunteerName;
        private Integer score;
        private Boolean passed;
        private String badgeEarned;
        private String badgeColor;
        private Integer timeTaken;
        private OffsetDateTime submittedAt;
        private List<QuizAnswerDTO> answers;
    }
}
