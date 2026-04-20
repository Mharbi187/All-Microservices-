package com.nexusaid.admin.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Stateless JWT authentication filter for admin-service (MS3).
 * Extracts user identity AND roles from the JWT issued by core-service (MS1).
 * No database call is made — all authorization data is embedded in the token.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        try {
            String userEmail = jwtService.extractUsername(jwt);
            UUID userId = jwtService.extractUserId(jwt);

            if (userEmail != null && userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Extract roles from JWT claims (populated by core-service AuthService)
                List<GrantedAuthority> authorities = extractAuthorities(jwt);

                User dummyUser = new User(userId, userEmail);
                UserDetailsImpl userDetails = new UserDetailsImpl(dummyUser, authorities);

                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (Exception e) {
            logger.warn("JWT Parsing Failed in MS3: " + e.getMessage());
            // Invalid token — let it hit unauthorized
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract GrantedAuthority list from JWT claims.
     * The JWT issued by core-service contains:
     * - "userType": "VOLUNTEER" | "DONOR" | "TRAINER" | "ADMIN"
     * - "roles": ["PRESIDENT", "RESP_CATASTROPHES", ...] (committee role titles)
     *
     * We map these to Spring Security authorities:
     * - ROLE_VOLUNTEER, ROLE_DONOR, etc. (from userType)
     * - ROLE_PRESIDENT, ROLE_RESP_CATASTROPHES, etc. (from committee roles)
     */
    private List<GrantedAuthority> extractAuthorities(String jwt) {
        List<GrantedAuthority> authorities = new ArrayList<>();

        // 1. Add base role from userType
        String userType = jwtService.extractClaim(jwt, claims -> claims.get("userType", String.class));
        if (userType != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + userType));
        }

        // 2. Add committee role titles
        @SuppressWarnings("unchecked")
        List<String> roles = jwtService.extractClaim(jwt, claims -> claims.get("roles", List.class));
        if (roles != null) {
            for (String role : roles) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
            }
        }

        return authorities;
    }
}
