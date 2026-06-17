package com.nexusaid.gateway.config;

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
        String publicKey = environment.getProperty("jwt.public.key", "");
        String publicKeyPath = environment.getProperty("jwt.public.key.path", "");

        boolean hasInlineKey = publicKey != null && !publicKey.trim().isEmpty();
        boolean hasKeyPath = publicKeyPath != null && !publicKeyPath.trim().isEmpty();

        if (!hasInlineKey && !hasKeyPath) {
            throw new IllegalStateException(
                "[JWT-SECURITY-ERROR] JWT verification key is required for api-gateway RS256 token verification.\n" +
                "Please set one of the following properties:\n" +
                "  - jwt.public.key: Inline RS256 public key (PEM format)\n" +
                "  - jwt.public.key.path: Path to public.pem file\n" +
                "See docs/JWT_RSA_KEY_SETUP.md for key generation instructions."
            );
        }
    }
}
