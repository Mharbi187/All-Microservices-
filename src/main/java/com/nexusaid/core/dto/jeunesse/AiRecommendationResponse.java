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
public class AiRecommendationResponse {
    private List<AiRecommendationDetail> recommandations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiRecommendationDetail {
        private String formation;
        private String priorité;
        private List<String> competences_developper;
        private String role_possible;
    }
}
