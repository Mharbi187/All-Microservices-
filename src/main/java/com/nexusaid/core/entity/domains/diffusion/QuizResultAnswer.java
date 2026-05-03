package com.nexusaid.core.entity.domains.diffusion;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuizResultAnswer {
    private Integer questionIndex;
    private String selectedAnswersCsv; // Comma separated indices, e.g., "0,2"
}
