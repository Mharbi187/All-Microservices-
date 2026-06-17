package com.nexusaid.core.controller;

import com.nexusaid.core.dto.AuthDtos.AuthResponse;
import com.nexusaid.core.dto.AuthDtos.ForgotPasswordRequest;
import com.nexusaid.core.dto.AuthDtos.LoginRequest;
import com.nexusaid.core.dto.AuthDtos.RefreshTokenRequest;
import com.nexusaid.core.dto.AuthDtos.RegisterRequest;
import com.nexusaid.core.dto.AuthDtos.ResetPasswordRequest;
import com.nexusaid.core.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request,
                                                  HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.register(request, ip, userAgent));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request,
                                               HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        AuthResponse response = authService.login(request, ip, userAgent);

        // If blocked or CAPTCHA required without token, return 200 with status
        // (Frontend reads captchaRequired / blockRemainingSeconds to adapt UI)
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody RefreshTokenRequest request,
                                                      HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        try {
            AuthResponse response = authService.refreshAccessToken(request.getRefreshToken(), ip);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(401)
                    .body(AuthResponse.builder()
                            .message(e.getMessage())
                            .build());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        try {
            authService.logout(ip);
            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("message", "Logged out"));
        }
    }

    /**
     * Initiates the forgotten-password flow.
     * Always returns 200 OK regardless of whether the email exists
     * (anti account-enumeration).
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            authService.initiatePasswordReset(request.getEmail());
        } catch (Exception e) {
            // Swallow all errors to prevent enumeration
        }
        return ResponseEntity.ok(Map.of(
                "message", "Si cette adresse e-mail est associée à un compte, vous recevrez un lien de réinitialisation."
        ));
    }

    /**
     * Validates a reset token and sets the new password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Extract client IP from request, considering proxy headers.
     */
    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
}
