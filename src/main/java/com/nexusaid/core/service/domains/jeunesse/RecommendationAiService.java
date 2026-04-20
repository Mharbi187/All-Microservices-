package com.nexusaid.core.service.domains.jeunesse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusaid.core.dto.jeunesse.AiRecommendationRequest;
import com.nexusaid.core.dto.jeunesse.AiRecommendationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class RecommendationAiService {

    @Value("${openrouter.api-key:not-configured}")
    private String apiKey;

    @Value("${openrouter.api-url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    @Value("${openrouter.model:meta-llama/llama-3.1-8b-instruct:free}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplateBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .readTimeout(Duration.ofSeconds(30))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiRecommendationResponse generateRecommendation(AiRecommendationRequest request) {
        try {
            String prompt = String.format(
                    "Agis comme un expert senior en développement de la jeunesse au Croissant-Rouge Tunisien (CRT). " +
                            "Analyse le profil du volontaire suivant :\n" +
                            "- Âge: %d\n" +
                            "- Expérience: %s\n" +
                            "- Compétences actuelles: %s\n" +
                            "- Disponibilité: %s\n" +
                            "- Centres d'intérêt: %s\n" +
                            "- Formation souhaitée: %s\n" +
                            "- Région: %s\n\n" +
                            "Génère entre 3 et 5 recommandations de formations et missions spécifiques au CRT. " +
                            "Retourne UNIQUEMENT un objet JSON valide suivant ce format exact :\n" +
                            "{\n" +
                            "  \"recommandations\": [\n" +
                            "    {\n" +
                            "      \"formation\": \"Nom précis de la formation au CRT\",\n" +
                            "      \"priorité\": \"Haute/Moyenne/Basse\",\n" +
                            "      \"competences_developper\": [\"compétence1\", \"compétence2\"],\n" +
                            "      \"role_possible\": \"Rôle suggéré lors des missions\"\n" +
                            "    }\n" +
                            "  ]\n" +
                            "}\n" +
                            "Ne fournis aucune explication textuelle en dehors du JSON.",
                    request.getAge(),
                    request.getExperience(),
                    String.join(", ", request.getCompetences()),
                    request.getDisponibilite(),
                    String.join(", ", request.getInterets()),
                    request.getFormation_souhaitee(),
                    request.getRegion());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            headers.set("HTTP-Referer", "http://localhost:3000");
            headers.set("X-Title", "Nexus-Aid CRT");

            Map<String, Object> body = Map.of(
                    "model", model,
                    "messages", List.of(
                            Map.of("role", "user", "content", prompt)));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> responseEntity = restTemplate.postForEntity(apiUrl, entity, String.class);

            if (responseEntity.getStatusCode() == HttpStatus.OK) {
                String responseBody = responseEntity.getBody();
                log.info("AI Response received: {}", responseBody);

                @SuppressWarnings("unchecked")
                Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseMap.get("choices");
                @SuppressWarnings("unchecked")
                String content = (String) ((Map<String, Object>) choices.get(0).get("message")).get("content");

                content = content.replaceAll("```json", "").replaceAll("```", "").trim();

                return objectMapper.readValue(content, AiRecommendationResponse.class);
            } else {
                throw new RuntimeException("Error calling OpenRouter: " + responseEntity.getStatusCode());
            }

        } catch (Exception e) {
            log.error("AI Recommendation generation failed", e);
            throw new RuntimeException("Échec de la génération des recommandations IA", e);
        }
    }
}
