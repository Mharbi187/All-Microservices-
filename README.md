# Nexus-AID: CONFIG-SERVER

This is the **config-server** microservice for the Nexus-AID platform.
This code has been isolated into its own branch to promote a loosely-coupled cloud architecture.

## CI/CD and Docker Portability
This repository branch includes a fully automated GitHub Actions pipeline. Every push to this branch will:
1. Build the code natively (Java).
2. Build the Docker container.
3. Push the pre-built image securely to **GitHub Container Registry (GHCR)**.

To run the full stack of applications, you do **not** need to build this specific service locally. Simply download the central \docker-compose.yml\ from the main branch and run \docker-compose up -d\.

## Local Development
If you need to develop locally on this specific service:
- Run "mvn spring-boot:run" or import into your IDE.
