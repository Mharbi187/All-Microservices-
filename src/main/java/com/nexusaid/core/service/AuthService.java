package com.nexusaid.core.service;

import com.nexusaid.core.dto.AuthDtos.AuthResponse;
import com.nexusaid.core.dto.AuthDtos.LoginRequest;
import com.nexusaid.core.dto.AuthDtos.RegisterRequest;
import com.nexusaid.core.entity.Donor;
import com.nexusaid.core.entity.PasswordResetToken;
import com.nexusaid.core.entity.RefreshToken;
import com.nexusaid.core.entity.Trainer;
import com.nexusaid.core.entity.User;
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.AccountStatus;
import com.nexusaid.core.entity.enums.UserType;
import com.nexusaid.core.repository.DonorRepository;
import com.nexusaid.core.repository.PasswordResetTokenRepository;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
        private final PasswordResetTokenRepository passwordResetTokenRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtService jwtService;
        private final AuthenticationManager authenticationManager;
        private final EventPublisher eventPublisher;
        private final EmailService emailService;

        // ── Security Services ──
        private final LoginAttemptService loginAttemptService;
        private final CaptchaService captchaService;
        private final SecurityAuditService auditService;
        private final AnomalyDetectionService anomalyDetectionService;

        /** Base URL used in reset-password links sent by email. */
        @Value("${app.frontend-url:http://localhost:9173}")
        private String frontendUrl;

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
                                        .flatMap(r -> {
                                                if (r.getCommittee() != null && r.getCommittee().getType() != null) {
                                                        return java.util.stream.Stream.of(
                                                                        r.getTitle().name(),
                                                                        r.getTitle().name() + "_" + r.getCommittee()
                                                                                        .getType().name());
                                                }
                                                return java.util.stream.Stream.of(r.getTitle().name());
                                        })
                                        .distinct()
                                        .collect(Collectors.toList());
                        if (user instanceof Trainer || user.getType() == UserType.TRAINER) {
                                if (!roleTitles.contains("TRAINER")) {
                                        roleTitles.add("TRAINER");
                                }
                        }
                        claims.put("roles", roleTitles);
                } else {
                        claims.put("roles", List.of());
                }
                return claims;
        }

        @Transactional
        public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {
                if (request.getEmail() != null) {
                        request.setEmail(request.getEmail().trim());
                }

                // ── Validate CAPTCHA for registration (always required) ──
                if (captchaService.isEnabled() && request.getCaptchaToken() != null
                                && !request.getCaptchaToken().isBlank()) {
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
                if (request.getEmail() != null) {
                        request.setEmail(request.getEmail().trim());
                }

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
                boolean captchaRequired = captchaService.isEnabled()
                                && loginAttemptService.isCaptchaRequired(ipAddress, email);
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

                return buildEnrichedAuthResponse(user, jwtToken, refreshToken.getToken(), "Login successful", false, 0,
                                0);
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

                return buildEnrichedAuthResponse(user, jwtToken, newRefreshToken.getToken(),
                                "Token refreshed successfully", false, 0, 0);
        }

        private AuthResponse buildEnrichedAuthResponse(User user, String token, String refreshToken, String message,
                        boolean captchaRequired, int failedAttempts, long blockRemainingSeconds) {
                String role = "volunteer";
                String delegation = "Non défini";
                String matricule = "CRT-000";

                String fullName = user.getFullName() != null ? user.getFullName() : "";
                String prenom = fullName.contains(" ") ? fullName.split(" ")[0] : fullName;
                String nom = fullName.contains(" ") ? fullName.substring(fullName.indexOf(" ") + 1) : "";
                List<String> certifications = List.of();

                if (user instanceof Volunteer) {
                        Volunteer volunteer = (Volunteer) user;
                        matricule = volunteer.getMatricule() != null ? volunteer.getMatricule() : matricule;
                        certifications = volunteer.getSkills() != null ? volunteer.getSkills() : certifications;

                        List<CommitteeRole> roles = committeeRoleRepository.findByVolunteerId(user.getId());
                        if (roles != null && !roles.isEmpty()) {
                                CommitteeRole highestRole = roles.stream()
                                                .filter(r -> r.getStatus() == CommitteeRoleStatus.APPROVED)
                                                .findFirst().orElse(roles.get(0));

                                String title = highestRole.getTitle().name();
                                if (title.contains("PRESIDENT"))
                                        role = "responsable";
                                else if (title.contains("NDRT"))
                                        role = "ndrt";
                                else if (title.contains("RDRT"))
                                        role = "rdrt";
                                else if (title.contains("CHEF_D_EQUIPE"))
                                        role = "chef_equipe";
                                else
                                        role = "secouriste";

                                if (highestRole.getCommittee() != null) {
                                        delegation = highestRole.getCommittee().getRegion();
                                }
                        }
                }

                return AuthResponse.builder()
                                .token(token)
                                .refreshToken(refreshToken)
                                .id(user.getId())
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .prenom(prenom)
                                .nom(nom)
                                .role(role)
                                .delegation(delegation)
                                .matricule(matricule)
                                .certifications(certifications)
                                .unreadNotifications(0)
                                .message(message)
                                .captchaRequired(captchaRequired)
                                .failedAttempts(failedAttempts)
                                .blockRemainingSeconds(blockRemainingSeconds)
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

        // ────────────────────────────────────────────────────────────
        // Password Reset Flow
        // ────────────────────────────────────────────────────────────

        /**
         * Initiates the password-reset flow for the given email.
         * If the email is unknown the method silently exits — this prevents
         * account enumeration attacks (the frontend always shows the same
         * generic success message regardless).
         */
        @Transactional
        public void initiatePasswordReset(String email) {
                // Normalise
                String normalised = email == null ? "" : email.trim().toLowerCase();

                // Silent exit if unknown — anti-enumeration
                if (!userRepository.findByEmail(normalised).isPresent()) {
                        log.info("Password reset requested for unknown email: {}", normalised);
                        return;
                }

                // Revoke any previous tokens for this email
                passwordResetTokenRepository.deleteByEmail(normalised);

                // Generate a secure opaque token
                String rawToken = UUID.randomUUID().toString().replace("-", "") +
                                  UUID.randomUUID().toString().replace("-", "");

                PasswordResetToken resetToken = PasswordResetToken.builder()
                                .token(rawToken)
                                .email(normalised)
                                .expiresAt(LocalDateTime.now().plusMinutes(60))
                                .used(false)
                                .build();
                passwordResetTokenRepository.save(resetToken);

                // Build the reset link
                String resetLink = frontendUrl + "/reset-password?token=" + rawToken;

                // Build the branded HTML email
                String htmlBody = buildResetPasswordEmailHtml(resetLink);
                emailService.sendHtmlEmail(
                                normalised,
                                "[Nexus-AID] Réinitialisation de votre mot de passe",
                                htmlBody
                );
                log.info("Password reset link sent to {}", normalised);
        }

        /**
         * Validates a reset token and sets the new password.
         * Throws {@link RuntimeException} with a user-facing message on any error.
         */
        @Transactional
        public void resetPassword(String rawToken, String newPassword) {
                // Validate password strength first
                validatePasswordStrength(newPassword);

                PasswordResetToken resetToken = passwordResetTokenRepository
                                .findByToken(rawToken)
                                .orElseThrow(() -> new RuntimeException("Lien de réinitialisation invalide ou expiré."));

                if (resetToken.isUsed()) {
                        throw new RuntimeException("Ce lien a déjà été utilisé. Veuillez faire une nouvelle demande.");
                }

                if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
                        passwordResetTokenRepository.delete(resetToken);
                        throw new RuntimeException("Lien de réinitialisation expiré. Veuillez faire une nouvelle demande.");
                }

                User user = userRepository.findByEmail(resetToken.getEmail())
                                .orElseThrow(() -> new RuntimeException("Compte introuvable."));

                // Update password
                user.setPassword(passwordEncoder.encode(newPassword));
                userRepository.save(user);

                // Invalidate token
                resetToken.setUsed(true);
                passwordResetTokenRepository.save(resetToken);

                log.info("Password successfully reset for user {}", user.getEmail());
        }

        /**
         * Builds the branded HTML email body for password reset.
         */
        private String buildResetPasswordEmailHtml(String resetLink) {
                return "<!DOCTYPE html>" +
                "<html lang='fr'>" +
                "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'>" +
                "<title>Réinitialisation du mot de passe - Nexus-AID</title></head>" +
                "<body style='margin:0;padding:0;background:#f5f6f8;font-family:Inter,Arial,sans-serif;'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' style='background:#f5f6f8;padding:40px 0;'>" +
                "<tr><td align='center'>" +
                "<table width='600' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);'>" +
                // Header
                "<tr><td style='background:linear-gradient(135deg,#C8102E 0%,#8B0000 100%);padding:40px 48px;'>" +
                "<table cellpadding='0' cellspacing='0' width='100%'><tr>" +
                "<td><span style='color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;'>❤ Nexus-AID</span>" +
                "<br><span style='color:rgba(255,255,255,0.75);font-size:13px;'>Croissant-Rouge Tunisien</span></td>" +
                "</tr></table></td></tr>" +
                // Body
                "<tr><td style='padding:48px;'>" +
                "<h1 style='margin:0 0 16px;font-size:26px;font-weight:700;color:#1a1a2e;'>Réinitialisation du mot de passe</h1>" +
                "<p style='color:#6b7280;font-size:15px;line-height:1.7;margin:0 0 32px;'>" +
                "Vous avez demandé la réinitialisation de votre mot de passe pour votre compte Nexus-AID. " +
                "Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>" +
                // CTA Button
                "<table cellpadding='0' cellspacing='0' width='100%'><tr><td align='center' style='padding:8px 0 40px;'>" +
                "<a href='" + resetLink + "' style='display:inline-block;padding:16px 40px;background:#C8102E;" +
                "color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:12px;" +
                "box-shadow:0 4px 16px rgba(200,16,46,0.35);'>" +
                "Réinitialiser mon mot de passe</a>" +
                "</td></tr></table>" +
                // Security notice
                "<div style='background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:32px;'>" +
                "<p style='margin:0;color:#991b1b;font-size:13px;line-height:1.6;'>" +
                "⏰ <strong>Ce lien est valable 60 minutes.</strong> Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé." +
                "</p></div>" +
                // Fallback link
                "<p style='color:#9ca3af;font-size:12px;word-break:break-all;'>" +
                "Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>" +
                "<a href='" + resetLink + "' style='color:#C8102E;'>" + resetLink + "</a></p>" +
                "</td></tr>" +
                // Footer
                "<tr><td style='background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 48px;'>" +
                "<p style='margin:0;color:#9ca3af;font-size:12px;text-align:center;'>" +
                "© 2025 Croissant-Rouge Tunisien — Plateforme Nexus-AID<br>" +
                "Cet email est automatique, merci de ne pas y répondre.</p>" +
                "</td></tr>" +
                "</table></td></tr></table></body></html>";
        }
}
