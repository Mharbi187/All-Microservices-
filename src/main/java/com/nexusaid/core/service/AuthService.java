package com.nexusaid.core.service;

import com.nexusaid.core.dto.AuthDtos.AuthResponse;
import com.nexusaid.core.dto.AuthDtos.LoginRequest;
import com.nexusaid.core.dto.AuthDtos.RegisterRequest;
import com.nexusaid.core.entity.Donor;
import com.nexusaid.core.entity.RefreshToken;
import com.nexusaid.core.entity.Trainer;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.DonorRepository;
import com.nexusaid.core.repository.TrainerRepository;
import com.nexusaid.core.repository.UserRepository;
import com.nexusaid.core.repository.VolunteerRepository;
import com.nexusaid.core.security.JwtService;
import com.nexusaid.core.security.UserDetailsImpl;
import com.nexusaid.core.entity.CommitteeRole;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.messaging.EventPublisher;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

        private final UserRepository userRepository;
        private final VolunteerRepository volunteerRepository;
        private final TrainerRepository trainerRepository;
        private final DonorRepository donorRepository;
        private final CommitteeRoleRepository committeeRoleRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;
        private final EventPublisher eventPublisher;

        // ── Security Services ──
        private final LoginAttemptService loginAttemptService;
        private final CaptchaService captchaService;
        private final SecurityAuditService auditService;
        private final AnomalyDetectionService anomalyDetectionService;

        /**
         * Build JWT extra claims with userId, userType, and committee roles.
         * This allows consuming microservices (MS3, etc.) to enforce RBAC
         * without making a DB call back to core-service.
         */
        private Map<String, Object> buildJwtClaims(User user) {
                Map<String, Object> claims = new HashMap<>();
                claims.put("userId", user.getId().toString());
                claims.put("userType", user.getType().name());

                // Add committee role titles for Volunteer users
                if (user instanceof Volunteer) {
                        List<CommitteeRole> roles = committeeRoleRepository.findByVolunteerId(user.getId());
                        List<String> roleTitles = roles.stream()
                                        .filter(r -> r.getStatus() == CommitteeRoleStatus.APPROVED)
                                        .map(r -> r.getTitle().name())
                                        .collect(Collectors.toList());
                        claims.put("roles", roleTitles);
                } else {
                        claims.put("roles", List.of());
                }
                return claims;
        }

        @Transactional
        public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {

                // ── Validate CAPTCHA for registration (always required) ──
                if (request.getCaptchaToken() != null && !request.getCaptchaToken().isBlank()) {
                        boolean captchaValid = captchaService.verify(request.getCaptchaToken(), "REGISTER");
                        if (!captchaValid) {
                                auditService.logEvent(
                                                com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType.CAPTCHA_FAILED,
                                                null, request.getEmail(), ipAddress, userAgent,
                                                "CAPTCHA verification failed during registration", false, 40);
                                throw new RuntimeException("CAPTCHA verification failed. Please try again.");
                        }
                }

                // ── Validate password strength ──
                validatePasswordStrength(request.getPassword());

                if (request.getUserType() == UserType.VOLUNTEER) {
                        Volunteer volunteer = new Volunteer();
                        volunteer.setEmail(request.getEmail());
                        volunteer.setPassword(passwordEncoder.encode(request.getPassword()));
                        volunteer.setFullName(request.getFullName());
                        volunteer.setCin(request.getCin());
                        volunteer.setPhone(request.getPhone());
                        volunteer.setType(UserType.VOLUNTEER);
                        volunteer.setAccountStatus(AccountStatus.PENDING); // MUST MATCH CDC REQUIREMENT

                        volunteer.setMatricule(request.getMatricule());
                        volunteer.setSkills(request.getSkills());
                        volunteer.setDateAdhesion(LocalDate.now());
                        volunteer.setHoursVolunteered(0.0);
                        volunteer.setCommitteeId(request.getCommitteeId());

                        volunteerRepository.save(volunteer);

                        eventPublisher.publishVolunteerRegistered(volunteer.getId(), volunteer.getEmail(),
                                        volunteer.getFullName());

                        // Log registration
                        auditService.logEvent(
                                        com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType.REGISTER,
                                        volunteer.getId(), volunteer.getEmail(), ipAddress, userAgent,
                                        "Volunteer registration", true, 0);

                        return AuthResponse.builder()
                                        .id(volunteer.getId())
                                        .email(volunteer.getEmail())
                                        .fullName(volunteer.getFullName())
                                        .message("Registration successful. Account is PENDING approval from the Committee President.")
                                        .build();
                } else if (request.getUserType() == UserType.DONOR) {
                        Donor donor = new Donor();
                        donor.setEmail(request.getEmail());
                        donor.setPassword(passwordEncoder.encode(request.getPassword()));
                        donor.setFullName(request.getFullName());
                        donor.setCin(request.getCin());
                        donor.setPhone(request.getPhone());
                        donor.setType(UserType.DONOR);
                        donor.setAccountStatus(AccountStatus.APPROVED);

                        donor.setPreferredCategories(request.getPreferredCategories());
                        donor.setTargetZones(request.getTargetZones());
                        donor.setTotalDonationsCount(0);
                        donorRepository.save(donor);

                        var jwtToken = jwtService.generateToken(buildJwtClaims(donor),
                                        new UserDetailsImpl(donor));
                        RefreshToken refreshToken = jwtService.createRefreshToken(donor.getId());

                        auditService.logEvent(
                                        com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType.REGISTER,
                                        donor.getId(), donor.getEmail(), ipAddress, userAgent,
                                        "Donor registration", true, 0);

                        return AuthResponse.builder()
                                        .token(jwtToken)
                                        .refreshToken(refreshToken.getToken())
                                        .id(donor.getId())
                                        .email(donor.getEmail())
                                        .fullName(donor.getFullName())
                                        .message("Registration successful.")
                                        .build();
                } else {
                        User user = new User();
                        user.setEmail(request.getEmail());
                        user.setPassword(passwordEncoder.encode(request.getPassword()));
                        user.setFullName(request.getFullName());
                        user.setCin(request.getCin());
                        user.setPhone(request.getPhone());
                        user.setType(request.getUserType());
                        user.setAccountStatus(AccountStatus.APPROVED);

                        userRepository.save(user);

                        var jwtToken = jwtService.generateToken(buildJwtClaims(user),
                                        new UserDetailsImpl(user));
                        RefreshToken refreshToken = jwtService.createRefreshToken(user.getId());

                        auditService.logEvent(
                                        com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType.REGISTER,
                                        user.getId(), user.getEmail(), ipAddress, userAgent,
                                        "User registration", true, 0);

                        return AuthResponse.builder()
                                        .token(jwtToken)
                                        .refreshToken(refreshToken.getToken())
                                        .id(user.getId())
                                        .email(user.getEmail())
                                        .fullName(user.getFullName())
                                        .message("Registration successful.")
                                        .build();
                }
        }

        public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {

                String email = request.getEmail();

                // ── 1. Check if IP is blocked ──
                if (loginAttemptService.isBlocked(ipAddress)) {
                        long remaining = loginAttemptService.getRemainingBlockSeconds(ipAddress);
                        int failedAttempts = loginAttemptService.getFailedAttempts(ipAddress);

                        auditService.logBlockedIp(ipAddress, email, failedAttempts);

                        return AuthResponse.builder()
                                        .message("Too many failed attempts. Please try again later.")
                                        .captchaRequired(true)
                                        .failedAttempts(failedAttempts)
                                        .blockRemainingSeconds(remaining)
                                        .build();
                }

                // ── 2. Check if CAPTCHA is required (after 2 failed attempts) ──
                boolean captchaRequired = loginAttemptService.isCaptchaRequired(ipAddress, email);
                if (captchaRequired) {
                        if (request.getCaptchaToken() == null || request.getCaptchaToken().isBlank()) {
                                int failedAttempts = loginAttemptService.getFailedAttempts(ipAddress);
                                auditService.logCaptchaTriggered(email, ipAddress, failedAttempts);

                                return AuthResponse.builder()
                                                .message("CAPTCHA verification required.")
                                                .captchaRequired(true)
                                                .failedAttempts(failedAttempts)
                                                .build();
                        }

                        boolean captchaValid = captchaService.verify(request.getCaptchaToken(), "LOGIN");
                        if (!captchaValid) {
                                loginAttemptService.recordFailure(ipAddress, email);
                                auditService.logEvent(
                                                com.nexusaid.core.entity.SecurityAuditLog.SecurityEventType.CAPTCHA_FAILED,
                                                null, email, ipAddress, userAgent,
                                                "CAPTCHA verification failed during login", false, 50);
                                int failedAttempts = loginAttemptService.getFailedAttempts(ipAddress);

                                return AuthResponse.builder()
                                                .message("CAPTCHA verification failed. Please try again.")
                                                .captchaRequired(true)
                                                .failedAttempts(failedAttempts)
                                                .build();
                        }
                }

                // ── 3. Authenticate ──
                try {
                        authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(email, request.getPassword()));
                } catch (org.springframework.security.authentication.DisabledException ex) {
                        // Account requires approval (isEnabled = false implies PENDING)
                        return AuthResponse.builder()
                                        .message("Your account is PENDING approval from the Committee. You cannot log in yet.")
                                        .build();
                } catch (AuthenticationException ex) {
                        // Record failure
                        loginAttemptService.recordFailure(ipAddress, email);
                        int failedAttempts = loginAttemptService.getFailedAttempts(ipAddress);

                        // Run anomaly detection
                        anomalyDetectionService.analyzeLoginBehavior(ipAddress, email);

                        // Log failure
                        auditService.logLoginFailure(email, ipAddress, userAgent, ex.getMessage());

                        boolean nowCaptchaRequired = loginAttemptService.isCaptchaRequired(ipAddress, email);
                        boolean nowBlocked = loginAttemptService.isBlocked(ipAddress);
                        long remaining = loginAttemptService.getRemainingBlockSeconds(ipAddress);

                        String message = nowBlocked
                                        ? "Account temporarily locked. Please try again in " + (remaining / 60)
                                                        + " minutes."
                                        : "Invalid email or password.";

                        return AuthResponse.builder()
                                        .message(message)
                                        .captchaRequired(nowCaptchaRequired || nowBlocked)
                                        .failedAttempts(failedAttempts)
                                        .blockRemainingSeconds(remaining)
                                        .build();
                }

                // ── 4. Success — generate tokens ──
                var user = userRepository.findByEmail(email).orElseThrow();

                loginAttemptService.recordSuccess(ipAddress, email);
                auditService.logLoginSuccess(user.getId(), email, ipAddress, userAgent);

                var jwtToken = jwtService.generateToken(buildJwtClaims(user),
                                new UserDetailsImpl(user));
                RefreshToken refreshToken = jwtService.createRefreshToken(user.getId());

                return AuthResponse.builder()
                                .token(jwtToken)
                                .refreshToken(refreshToken.getToken())
                                .id(user.getId())
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .message("Login successful")
                                .captchaRequired(false)
                                .failedAttempts(0)
                                .blockRemainingSeconds(0)
                                .build();
        }

        /**
         * Refresh an access token using a valid refresh token.
         */
        @Transactional
        public AuthResponse refreshAccessToken(String refreshTokenStr, String ipAddress) {
                RefreshToken newRefreshToken = jwtService.rotateRefreshToken(refreshTokenStr);

                var user = userRepository.findById(newRefreshToken.getUserId())
                                .orElseThrow(() -> new RuntimeException("User not found for refresh token"));

                var jwtToken = jwtService.generateToken(buildJwtClaims(user),
                                new UserDetailsImpl(user));

                auditService.logTokenRefresh(user.getId(), user.getEmail(), ipAddress);

                return AuthResponse.builder()
                                .token(jwtToken)
                                .refreshToken(newRefreshToken.getToken())
                                .id(user.getId())
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .message("Token refreshed successfully")
                                .build();
        }

        /**
         * Logout — revoke all refresh tokens for the user.
         */
        @Transactional
        public void logout(String ipAddress) {
                User user = getCurrentUser();
                jwtService.revokeAllUserTokens(user.getId());
                auditService.logLogout(user.getId(), user.getEmail(), ipAddress);
        }

        public User getCurrentUser() {
                Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
                if (principal instanceof UserDetailsImpl userDetails) {
                        return userDetails.getUser();
                }
                // Fallback for non-UserDetails principal (should not happen with our current
                // config)
                return userRepository.findByEmail(principal.toString())
                                .orElseThrow(() -> new RuntimeException("Authenticated user not found."));
        }

        /**
         * Validate password strength.
         * Requires: ≥ 8 chars, uppercase, lowercase, digit, special character.
         */
        private void validatePasswordStrength(String password) {
                if (password == null || password.length() < 8) {
                        throw new RuntimeException("Password must be at least 8 characters long.");
                }
                if (!password.matches(".*[A-Z].*")) {
                        throw new RuntimeException("Password must contain at least one uppercase letter.");
                }
                if (!password.matches(".*[a-z].*")) {
                        throw new RuntimeException("Password must contain at least one lowercase letter.");
                }
                if (!password.matches(".*\\d.*")) {
                        throw new RuntimeException("Password must contain at least one digit.");
                }
                if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
                        throw new RuntimeException("Password must contain at least one special character.");
                }
        }
}
