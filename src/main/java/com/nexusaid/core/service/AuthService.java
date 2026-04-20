package com.nexusaid.core.service;

import com.nexusaid.core.dto.AuthDtos.AuthResponse;
import com.nexusaid.core.dto.AuthDtos.LoginRequest;
import com.nexusaid.core.dto.AuthDtos.RegisterRequest;
import com.nexusaid.core.entity.Donor;
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
import com.nexusaid.core.entity.Volunteer;
import com.nexusaid.core.entity.enums.CommitteeRoleStatus;
import com.nexusaid.core.messaging.EventPublisher;
import com.nexusaid.core.repository.CommitteeRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
        public AuthResponse register(RegisterRequest request) {

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
                        return AuthResponse.builder()
                                        .token(jwtToken)
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
                        return AuthResponse.builder()
                                        .token(jwtToken)
                                        .id(user.getId())
                                        .email(user.getEmail())
                                        .fullName(user.getFullName())
                                        .message("Registration successful.")
                                        .build();
                }
        }

        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getEmail(),
                                                request.getPassword()));
                var user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow();

                // If account is PENDING, the AuthenticationManager will throw DisabledException
                // due to UserDetails.isEnabled()

                var jwtToken = jwtService.generateToken(buildJwtClaims(user),
                                new UserDetailsImpl(user));
                return AuthResponse.builder()
                                .token(jwtToken)
                                .id(user.getId())
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .message("Login successful")
                                .build();
        }
}
