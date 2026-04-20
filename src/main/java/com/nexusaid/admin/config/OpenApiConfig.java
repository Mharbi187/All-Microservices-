package com.nexusaid.admin.config;

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
    public OpenAPI nexusAidAdminOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NexusAid Admin Service API")
                        .description("Module 3 — Administration, Reporting et Donations du Croissant Rouge Tunisien. "
                                + "Templates de rapports, Workflow d'approbation (SG → Président), "
                                + "Donations monétaires/en nature, Reçus fiscaux PDF/QR.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Mohamed Harbi & Ala Amara")
                                .email("contact@nexusaid.com"))
                        .license(new License()
                                .name("Propriétaire — CRT")
                                .url("https://www.croissant-rouge.tn/")))
                .servers(List.of(
                        new Server().url("http://localhost:8081").description("Direct"),
                        new Server().url("http://localhost:8060").description("Via API Gateway")));
    }
}
