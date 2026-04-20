package com.nexusaid.core.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

/**
 * Configuration for Cloudinary SDK.
 * This bean is used to perform administrative tasks like deleting images.
 */
@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud-name:dummy}")
    private String cloudName;

    @Value("${cloudinary.api-key:dummy}")
    private String apiKey;

    @Value("${cloudinary.api-secret:dummy}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        Map<String, String> config = ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret);
        return new Cloudinary(config);
    }
}
