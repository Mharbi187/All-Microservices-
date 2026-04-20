package com.nexusaid.core.security;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * Validates JWT RS256 environment variables before Spring context startup.
 * Fails fast with clear error message if JWT_PRIVATE_KEY* variables are missing.
 */
public class JwtEnvironmentValidator implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String privateKey = environment.getProperty("JWT_PRIVATE_KEY", "");
        String privateKeyPath = environment.getProperty("JWT_PRIVATE_KEY_PATH", "");

        boolean hasInlineKey = privateKey != null && !privateKey.trim().isEmpty();
        boolean hasKeyPath = privateKeyPath != null && !privateKeyPath.trim().isEmpty();

        if (!hasInlineKey && !hasKeyPath) {
            throw new IllegalStateException(
                "[JWT-SECURITY-ERROR] JWT signing key is required for core-service RS256 token generation.\n" +
                "Please set one of the following environment variables:\n" +
                "  - JWT_PRIVATE_KEY: Inline RS256 private key (PEM format)\n" +
                "  - JWT_PRIVATE_KEY_PATH: Path to private.pem file\n" +
                "See docs/JWT_RSA_KEY_SETUP.md for key generation instructions."
            );
        }
    }
}
