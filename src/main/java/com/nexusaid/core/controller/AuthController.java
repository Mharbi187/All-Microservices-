package com.nexusaid.core.controller;

import com.nexusaid.core.dto.AuthDtos.AuthResponse;
import com.nexusaid.core.dto.AuthDtos.LoginRequest;
import com.nexusaid.core.dto.AuthDtos.RegisterRequest;
import com.nexusaid.core.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
