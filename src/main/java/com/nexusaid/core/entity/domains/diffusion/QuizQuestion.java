package com.nexusaid.core.entity.domains.diffusion;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz_questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestion {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private Quiz quiz;

    @Column(nullable = false)
    private String text;

    @Column(nullable = false)
    private String type;

    private Integer points;

    @ElementCollection
    @CollectionTable(name = "quiz_question_options", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "option_text")
    @Builder.Default
    private List<String> options = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "quiz_question_correct_answers", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "answer_index")
    @Builder.Default
    private List<Integer> correctAnswers = new ArrayList<>();
}
