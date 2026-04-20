package com.nexusaid.admin.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Validates JWT RS256 environment variables before Spring context startup.
 * Fails fast with clear error message if JWT_PUBLIC_KEY* variables are missing.
 */
public class JwtEnvironmentValidator implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String publicKey = environment.getProperty("JWT_PUBLIC_KEY", "");
        String publicKeyPath = environment.getProperty("JWT_PUBLIC_KEY_PATH", "");

        boolean hasInlineKey = publicKey != null && !publicKey.trim().isEmpty();
        boolean hasKeyPath = publicKeyPath != null && !publicKeyPath.trim().isEmpty();

        if (!hasInlineKey && !hasKeyPath) {
            throw new IllegalStateException(
                "[JWT-SECURITY-ERROR] JWT verification key is required for admin-service RS256 token verification.\n" +
                "Please set one of the following environment variables:\n" +
                "  - JWT_PUBLIC_KEY: Inline RS256 public key (PEM format)\n" +
                "  - JWT_PUBLIC_KEY_PATH: Path to public.pem file\n" +
                "See docs/JWT_RSA_KEY_SETUP.md for key generation instructions."
            );
        }
    }
}
