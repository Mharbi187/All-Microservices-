package com.nexusaid.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI nexusAidCoreOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NexusAid Core Service API")
                        .description("Module 1 — Gestion Sociale et des Ressources du Croissant Rouge Tunisien. "
                                + "Authentification, Profils, Hiérarchie des Comités, Inventaire, Interventions, Badges QR.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Mohamed Harbi & Ala Amara")
                                .email("contact@nexusaid.com"))
                        .license(new License()
                                .name("Propriétaire — CRT")
                                .url("https://www.croissant-rouge.tn/")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Direct"),
                        new Server().url("http://localhost:8060").description("Via API Gateway")));
    }
}
