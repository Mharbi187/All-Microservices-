package com.nexusaid.core.service.domains.diffusion;

import com.nexusaid.core.dto.QuizDTOs.*;
import com.nexusaid.core.entity.Committee;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.domains.diffusion.Quiz;
import com.nexusaid.core.entity.domains.diffusion.QuizQuestion;
import com.nexusaid.core.entity.domains.diffusion.QuizResult;
import com.nexusaid.core.entity.domains.diffusion.QuizResultAnswer;
import com.nexusaid.core.entity.enums.CommitteeType;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.CommitteeRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.repository.domains.diffusion.QuizRepository;
import com.nexusaid.core.repository.domains.diffusion.QuizResultRepository;
import com.nexusaid.core.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizResultRepository quizResultRepository;
    private final UserRepository userRepository;
    private final VolunteerRepository volunteerRepository;
    private final CommitteeRepository committeeRepository;
    private final AuthService authService;

    @Transactional(readOnly = true)
    public List<QuizDTO> getQuizzes(UUID committeeId) {
        List<Quiz> quizzes;
        if (committeeId != null) {
            quizzes = quizRepository.findAllVisible(committeeId);
        } else {
            quizzes = quizRepository.findAllOrdered();
        }
        return quizzes.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<QuizDTO> getPublishedQuizzes(UUID committeeId) {
        List<Quiz> quizzes;
        if (committeeId != null) {
            quizzes = quizRepository.findPublishedVisible(committeeId);
        } else {
            quizzes = quizRepository.findAllPublishedOrdered();
        }
        return quizzes.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public QuizDTO getQuizById(UUID id) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
        return mapToDTO(quiz);
    }

    @Transactional
    public QuizDTO createQuiz(QuizCreateDTO createDTO) {
        User currentUser = authService.getCurrentUser();
        Committee committee = null;
        if (createDTO.getCommitteeId() != null) {
            committee = committeeRepository.findById(createDTO.getCommitteeId())
                    .orElseThrow(() -> new IllegalArgumentException("Committee not found"));
        }

        CommitteeType scope = CommitteeType.LOCAL;
        if (createDTO.getTargetScope() != null) {
            try { scope = CommitteeType.valueOf(createDTO.getTargetScope()); } catch (Exception ignored) {}
        }

        Quiz quiz = Quiz.builder()
                .title(createDTO.getTitle())
                .description(createDTO.getDescription())
                .category(createDTO.getCategory() == null ? "DIFFUSION" : createDTO.getCategory())
                .minScore(createDTO.getMinScore() != null ? createDTO.getMinScore() : 50)
                .timeLimit(createDTO.getTimeLimit())
                .badgeTitle(createDTO.getBadgeTitle())
                .badgeColor(createDTO.getBadgeColor())
                .targetScope(scope)
                .status("DRAFT")
                .createdBy(currentUser)
                .committee(committee)
                .build();

        if (createDTO.getQuestions() != null) {
            for (QuizQuestionDTO qDto : createDTO.getQuestions()) {
                QuizQuestion q = QuizQuestion.builder()
                        .quiz(quiz)
                        .text(qDto.getText())
                        .type(qDto.getType())
                        .points(qDto.getPoints() != null ? qDto.getPoints() : 10)
                        .options(qDto.getOptions())
                        .correctAnswers(qDto.getCorrectAnswers())
                        .build();
                quiz.getQuestions().add(q);
            }
        }

        Quiz saved = quizRepository.save(quiz);
        return mapToDTO(saved);
    }

    @Transactional
    public QuizDTO publishQuiz(UUID quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
        quiz.setStatus("PUBLISHED");
        return mapToDTO(quizRepository.save(quiz));
    }

    @Transactional
    public void archiveQuiz(UUID quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));
        quiz.setStatus("ARCHIVED");
        quizRepository.save(quiz);
    }

    @Transactional
    public void deleteQuiz(UUID quizId) {
        quizRepository.deleteById(quizId);
    }

    @Transactional
    public QuizResultDTO submitQuiz(QuizSubmitDTO submitDTO) {
        User currentUser = authService.getCurrentUser();
        Volunteer volunteer = volunteerRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Only volunteers can submit quizzes"));

        Quiz quiz = quizRepository.findById(submitDTO.getQuizId())
                .orElseThrow(() -> new IllegalArgumentException("Quiz not found"));

        int totalPoints = 0;
        int earnedPoints = 0;

        List<QuizResultAnswer> resultAnswers = new ArrayList<>();

        for (int i = 0; i < quiz.getQuestions().size(); i++) {
            QuizQuestion q = quiz.getQuestions().get(i);
            totalPoints += q.getPoints();

            List<Integer> selected = new ArrayList<>();
            if (submitDTO.getAnswers() != null) {
                for (QuizAnswerDTO ans : submitDTO.getAnswers()) {
                    if (ans.getQuestionIndex() != null && ans.getQuestionIndex() == i) {
                        selected = ans.getSelectedAnswers();
                        break;
                    }
                }
            }

            boolean isCorrect = true;
            if (q.getCorrectAnswers() == null || selected == null) {
                isCorrect = false;
            } else if (q.getCorrectAnswers().size() != selected.size()) {
                isCorrect = false;
            } else {
                for (Integer correctIdx : q.getCorrectAnswers()) {
                    if (!selected.contains(correctIdx)) {
                        isCorrect = false;
                        break;
                    }
                }
            }

            if (isCorrect) {
                earnedPoints += q.getPoints();
            }

            String selectedCsv = selected != null ? selected.stream().map(String::valueOf).collect(Collectors.joining(",")) : "";
            resultAnswers.add(new QuizResultAnswer(i, selectedCsv));
        }

        int scorePercentage = totalPoints > 0 ? (int) Math.round(((double) earnedPoints / totalPoints) * 100) : 0;
        boolean passed = scorePercentage >= quiz.getMinScore();

        QuizResult result = QuizResult.builder()
                .quiz(quiz)
                .volunteer(volunteer)
                .score(scorePercentage)
                .passed(passed)
                .badgeEarned(passed ? quiz.getBadgeTitle() : null)
                .badgeColor(passed ? quiz.getBadgeColor() : null)
                .timeTaken(submitDTO.getTimeTaken())
                .answers(resultAnswers)
                .build();

        QuizResult saved = quizResultRepository.save(result);
        return mapResultToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<QuizResultDTO> getMyResults() {
        User currentUser = authService.getCurrentUser();
        List<QuizResult> results = quizResultRepository.findByVolunteerIdOrderBySubmittedAtDesc(currentUser.getId());
        return results.stream().map(this::mapResultToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<QuizResultDTO> getQuizResults(UUID quizId) {
        List<QuizResult> results = quizResultRepository.findByQuizId(quizId);
        return results.stream().map(this::mapResultToDTO).collect(Collectors.toList());
    }

    private QuizDTO mapToDTO(Quiz entity) {
        QuizDTO dto = new QuizDTO();
        dto.setId(entity.getId());
        dto.setTitle(entity.getTitle());
        dto.setDescription(entity.getDescription());
        dto.setCategory(entity.getCategory());
        dto.setMinScore(entity.getMinScore());
        dto.setTimeLimit(entity.getTimeLimit());
        dto.setBadgeTitle(entity.getBadgeTitle());
        dto.setBadgeColor(entity.getBadgeColor());
        dto.setTargetScope(entity.getTargetScope() != null ? entity.getTargetScope().name() : "LOCAL");
        dto.setStatus(entity.getStatus());
        dto.setCommitteeId(entity.getCommittee() != null ? entity.getCommittee().getId() : null);
        dto.setCommitteeName(entity.getCommittee() != null ? entity.getCommittee().getName() : null);
        dto.setCreatedByName(entity.getCreatedBy() != null ? entity.getCreatedBy().getFullName() : null);
        dto.setCreatedAt(entity.getCreatedAt());

        int totalParticipants = quizResultRepository.countByQuizId(entity.getId());
        dto.setTotalParticipants(totalParticipants);
        if (totalParticipants > 0) {
            int passed = quizResultRepository.countByQuizIdAndPassedTrue(entity.getId());
            dto.setPassRate((double) passed / totalParticipants * 100);
        } else {
            dto.setPassRate(0.0);
        }

        if (entity.getQuestions() != null) {
            List<QuizQuestionDTO> qDtos = entity.getQuestions().stream().map(q -> {
                QuizQuestionDTO qDto = new QuizQuestionDTO();
                qDto.setId(q.getId());
                qDto.setText(q.getText());
                qDto.setType(q.getType());
                qDto.setOptions(q.getOptions());
                qDto.setCorrectAnswers(q.getCorrectAnswers());
                qDto.setPoints(q.getPoints());
                return qDto;
            }).collect(Collectors.toList());
            dto.setQuestions(qDtos);
        }
        return dto;
    }

    private QuizResultDTO mapResultToDTO(QuizResult entity) {
        QuizResultDTO dto = new QuizResultDTO();
        dto.setId(entity.getId());
        dto.setQuizId(entity.getQuiz().getId());
        dto.setQuizTitle(entity.getQuiz().getTitle());
        dto.setVolunteerId(entity.getVolunteer().getId());
        dto.setVolunteerName(entity.getVolunteer().getFullName() != null ? entity.getVolunteer().getFullName() : "Unknown");
        dto.setScore(entity.getScore());
        dto.setPassed(entity.getPassed());
        dto.setBadgeEarned(entity.getBadgeEarned());
        dto.setBadgeColor(entity.getBadgeColor());
        dto.setTimeTaken(entity.getTimeTaken());
        dto.setSubmittedAt(entity.getSubmittedAt());

        if (entity.getAnswers() != null) {
            List<QuizAnswerDTO> ansDtos = entity.getAnswers().stream().map(a -> {
                QuizAnswerDTO aDto = new QuizAnswerDTO();
                aDto.setQuestionIndex(a.getQuestionIndex());
                List<Integer> selected = new ArrayList<>();
                if (a.getSelectedAnswersCsv() != null && !a.getSelectedAnswersCsv().isEmpty()) {
                    for (String s : a.getSelectedAnswersCsv().split(",")) {
                        selected.add(Integer.parseInt(s.trim()));
                    }
                }
                aDto.setSelectedAnswers(selected);
                return aDto;
            }).collect(Collectors.toList());
            dto.setAnswers(ansDtos);
        }

        return dto;
    }
}
