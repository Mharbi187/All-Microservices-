package com.nexusaid.core.dto.jeunesse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendationRequest {
    private Integer age;
    private String experience;
    private List<String> competences;
    private String disponibilite;
    private List<String> interets;
    private String formation_souhaitee;
    private String region;
}
