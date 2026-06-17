package com.nexusaid.core.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexusaid.core.dto.AuthDtos.AuthResponse;
import com.nexusaid.core.dto.AuthDtos.LoginRequest;
import com.nexusaid.core.dto.AuthDtos.RegisterRequest;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.service.AuthService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // Bypass Spring Security for unit testing the controller logic
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void register_shouldReturnAuthResponse() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setEmail("test@test.com");
        registerRequest.setPassword("password123");

        AuthResponse authResponse = AuthResponse.builder()
                .token("mock-access-token")
                .refreshToken("mock-refresh-token")
                .message("Registered successfully")
                .build();

        Mockito.when(authService.register(any(RegisterRequest.class), any(), any()))
                .thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-access-token"))
                .andExpect(jsonPath("$.message").value("Registered successfully"));
    }

    @Test
    void login_shouldReturnAuthResponse() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("test@test.com");
        loginRequest.setPassword("password123");

        AuthResponse authResponse = AuthResponse.builder()
                .token("mock-access-token")
                .message("Logged in successfully")
                .build();

        Mockito.when(authService.login(any(LoginRequest.class), any(), any()))
                .thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("mock-access-token"))
                .andExpect(jsonPath("$.message").value("Logged in successfully"));
    }
}
