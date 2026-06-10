package com.nexusaid.core.controller.domains.social;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusaid.core.entity.domains.social.Family;
import com.nexusaid.core.entity.domains.social.SocialAction;
import com.nexusaid.core.entity.domains.social.VulnerabilityScore;
import com.nexusaid.core.service.domains.social.SocialService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import com.nexusaid.core.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SocialController.class)
@AutoConfigureMockMvc(addFilters = false) // Disable security filters for pure controller testing if needed, though
                                          // WithMockUser handles it
public class SocialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SocialService socialService;

    @MockBean
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private Family testFamily;
    private VulnerabilityScore testScore;
    private SocialAction testAction;
    private UUID familyId;

    @BeforeEach
    void setUp() {
        familyId = UUID.randomUUID();

        testFamily = new Family();
        testFamily.setId(familyId);
        testFamily.setFamilyName("Amrani");
        testFamily.setHeadOfFamily("Ahmed Amrani");
        testFamily.setMembers(5);
        testFamily.setStatus("ACTIVE");

        testScore = new VulnerabilityScore();
        testScore.setFamilyId(testFamily.getId());
        testScore.setScore(85);
        testScore.setTrend("WORSENING");

        testAction = new SocialAction();
        testAction.setId(UUID.randomUUID());
        testAction.setFamilyId(testFamily.getId());
        testAction.setActionType("FOOD_DELIVERY");
        testAction.setQuantity(2);
    }

    @Test
    @WithMockUser(roles = "RESP_ACTION_SOCIALE")
    void getFamilyById() throws Exception {
        Mockito.when(socialService.getFamilyById(familyId)).thenReturn(java.util.Optional.of(testFamily));

        mockMvc.perform(get("/api/v1/social/families/" + familyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.familyName").value("Amrani"))
                .andExpect(jsonPath("$.headOfFamily").value("Ahmed Amrani"));
    }

    @Test
    @WithMockUser(roles = "PRESIDENT")
    void createFamily() throws Exception {
        Mockito.when(socialService.registerFamily(any(Family.class), any(UUID.class))).thenReturn(testFamily);

        mockMvc.perform(post("/api/v1/social/families")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testFamily)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.familyName").value("Amrani"));
    }

    @Test
    @WithMockUser(roles = "RESP_ACTION_SOCIALE")
    void getScoreHistory() throws Exception {
        Mockito.when(socialService.getScoreHistory(familyId)).thenReturn(Collections.singletonList(testScore));

        mockMvc.perform(get("/api/v1/social/families/" + familyId + "/score/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].score").value(85))
                .andExpect(jsonPath("$[0].trend").value("WORSENING"));
    }

    @Test
    @WithMockUser(roles = "RESP_ACTION_SOCIALE")
    void getAnalytics() throws Exception {
        Map<String, Object> mockAnalytics = new HashMap<>();
        mockAnalytics.put("totalFamilies", 100);
        mockAnalytics.put("urgentCases", 15);

        Mockito.when(socialService.getAnalytics()).thenReturn(mockAnalytics);

        mockMvc.perform(get("/api/v1/social/analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFamilies").value(100))
                .andExpect(jsonPath("$.urgentCases").value(15));
    }
}
