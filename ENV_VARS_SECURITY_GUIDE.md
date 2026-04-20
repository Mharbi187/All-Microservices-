# 🔐 Environment Variables Configuration Guide
## NexusAid Microservices — Security & Deployment

### ⚠️ CRITICAL: This file MUST be reviewed before deployment!

---

## Database Configuration (ALL SERVICES)

### PostgreSQL Primary Database
```bash
# Core-Service & Config-Server
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/nexusaiddb
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=[REQUIRED - Set randomly, minimum 20 chars]
```

### PostgreSQL Admin Database
```bash
# Admin-Service
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/nexusaid_admin
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=[REQUIRED - Same or different from above]
```

---

## JWT Configuration (ALL SERVICES)

### Current: RS256 (RSA Asymmetric) ✅
**Why**: Secures token exchange between microservices without sharing private keys

```bash
# Core-Service Signs Tokens (PRIVATE KEY)
# Core service loads: classpath:private.pem
# Never expose this file!
JWT_PRIVATE_KEY_PATH=/secure/path/to/private.pem

# Admin-Service & MS4 Verify Tokens (PUBLIC KEY)
# These services load: classpath:public.pem
JWT_PUBLIC_KEY_PATH=/secure/path/to/public.pem
# OR use inline:
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...base64 encoded key...\n-----END PUBLIC KEY-----"

# Token Expiration (milliseconds)
JWT_EXPIRATION=86400000  # 24 hours
```

### Key Generation
```bash
# Generate RSA keypair (do this ONCE, store securely):
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Verify keys:
openssl rsa -in private.pem -text -noout
openssl rsa -in public.pem -text -noout -pubin
```

---

## RabbitMQ Configuration

```bash
# Message Broker
SPRING_RABBITMQ_HOST=rabbitmq
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=nexusaid
SPRING_RABBITMQ_PASSWORD=[REQUIRED - 20+ chars]

# Retry Configuration
RABBITMQ_PUBLISHER_CONFIRM_TYPE=correlated
RABBITMQ_PUBLISHER_RETURNS=true
RABBITMQ_LISTENER_RETRY_ENABLED=true
RABBITMQ_LISTENER_RETRY_INITIAL_INTERVAL=1000
RABBITMQ_LISTENER_RETRY_MAX_ATTEMPTS=3
RABBITMQ_LISTENER_RETRY_MAX_INTERVAL=10000
```

---

## Admin-Service Specific Secrets

### AES Master Key (Data Encryption)
```bash
# ⚠️ CRITICAL: 32-byte (256-bit) encryption key
# Generate: head -c 32 /dev/urandom | base64
AES_MASTER_KEY=[REQUIRED - 44 character base64 string exactly]

# Validate:
echo $AES_MASTER_KEY | wc -c  # Should be 45 (44 + newline)
```

### MinIO (Object Storage)
```bash
# S3-compatible object storage for donations, receipts, PDFs
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=[REQUIRED]
MINIO_SECRET_KEY=[REQUIRED - 40+ chars]
MINIO_BUCKET=nexusaid-admin-files

# For HTTPS (production):
MINIO_ENDPOINT=https://minio-prod.yourdomain.com
MINIO_USE_SSL=true
```

### Cloudinary (Image CDN)
```bash
# Cloud image management for user avatars, documents
CLOUDINARY_CLOUD_NAME=[REQUIRED]
CLOUDINARY_API_KEY=[REQUIRED]
CLOUDINARY_API_SECRET=[REQUIRED]
```

---

## Core-Service Specific Secrets

### Cloud Geographic Services
```bash
# Google Cloud (Disaster Detection - GEE)
GCP_PROJECT_ID=[REQUIRED]
GCP_SERVICE_ACCOUNT_JSON=/secure/serviceaccount.json  # DO NOT COMMIT
GCP_REGION=us-central1

# Earth Engine Initialization
GEE_EMAIL=[service account email]
GEE_PRIVATE_KEY_ID=[from JSON]
GEE_PRIVATE_KEY=[from JSON - encrypted]
```

---

## Inter-Service Configuration

### Core Service URL (for Admin & MS4)
```bash
# Service Discovery via Eureka (PREFERRED)
EUREKA_SERVER=http://eureka-server:8761/eureka

# Hard-coded fallback (for local dev only)
CORE_SERVICE_URL=http://core-service:8080
```

### Admin Service URL (for MS4)
```bash
ADMIN_SERVICE_URL=http://admin-service:8081
```

### Config Server
```bash
# All services load config from centralized server
SPRING_CONFIG_IMPORT=optional:configserver:http://config-server:8888
CONFIG_SERVER_USERNAME=configuser
CONFIG_SERVER_PASSWORD=[REQUIRED]
```

---

## Disaster Detection (MS4) Configuration

### FastAPI Service
```bash
MS4_PORT=8000
MS4_HOST=0.0.0.0
MS4_WORKERS=4  # Number of FastAPI workers
MS4_LOG_LEVEL=INFO
```

### Machine Learning
```bash
# Model paths (must exist before service starts)
ML_RISK_MODEL_PATH=/models/disaster_risk_model.pkl
ML_WILDFIRE_MODEL_PATH=/models/wildfire_classifier.pkl
ML_FLOOD_MODEL_PATH=/models/flood_predictor.pkl

# Model Update Frequency
ML_MODEL_CACHE_TTL=3600  # seconds = 1 hour
```

### GEE Satellite Data
```bash
# Image collection parameters
GEE_IMAGE_COLLECTION=MODIS_TERRA
GEE_START_DATE=2024-01-01
GEE_END_DATE=2024-12-31
GEE_SCALE=1000  # pixels (1000m = 1km)
GEE_SAMPLE_SIZE=1000  # random samples per analysis
```

---

## Frontend Configuration

### React SPA
```bash
# API Base URL
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=wss://api.yourdomain.com/ws

# Feature Flags
VITE_ENABLE_CPR_ASSESSMENT=true
VITE_ENABLE_CRISIS_ROOM=true
VITE_ENABLE_DISASTER_ALERTS=true

# Analytics
VITE_SENTRY_DSN=[optional - error tracking]
VITE_ANALYTICS_KEY=[optional - usage tracking]
```

---

## Logging & Monitoring Configuration

### Centralized Logging (Future)
```bash
# Elasticsearch
ELASTICSEARCH_HOST=elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=[REQUIRED]

# Log Level
LOG_LEVEL=INFO  # INFO, DEBUG, WARN, ERROR
SPRING_JPA_SHOW_SQL=false  # Disable SQL logging in production
```

### Distributed Tracing (Future)
```bash
# Jaeger
JAEGER_AGENT_HOST=jaeger:6831
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317
OTEL_SERVICE_NAME=nexusaid-services
```

### Health Checks
```bash
# Actuator endpoints (internal)
MANAGEMENT_ENDPOINTS_WEB_EXPOSURE=health,metrics,info
MANAGEMENT_ENDPOINT_HEALTH_SHOW_DETAILS=when-authorized
ACTUATOR_ENABLED=true
```

---

## Deployment Profiles

### Local Development
```bash
# docker-compose.yml loads .env file
SPRING_PROFILES_ACTIVE=local
ENVIRONMENT=development

# All servers on localhost
POSTGRES_HOST=localhost
RABBITMQ_HOST=localhost
REDIS_HOST=localhost
MINIO_HOST=localhost
```

### Staging
```bash
SPRING_PROFILES_ACTIVE=staging
ENVIRONMENT=staging

# Docker network names
POSTGRES_HOST=postgres
RABBITMQ_HOST=rabbitmq
JWT_EXPIRATION=3600000  # 1 hour for testing
```

### Production
```bash
SPRING_PROFILES_ACTIVE=production
ENVIRONMENT=production

# External service URLs
POSTGRES_HOST=postgres-prod.rds.amazonaws.com  # Or managed service
RABBITMQ_HOST=rabbitmq-prod.internal
JWT_EXPIRATION=86400000  # 24 hours

# Security hardening
SPRING_SECURITY_REQUIRE_HTTPS=true
SPRING_JPA_SHOW_SQL=false
DEBUG=false
```

---

## Security Checklist

### Before Production Deployment ✅

- [ ] All `${VAR_NAME}` in config files have corresponding env vars
- [ ] No hardcoded passwords, API keys, or JWT secrets (except deprecated warnings)
- [ ] Private keys (*.pem) are in `.gitignore`
- [ ] All PII/secrets use strong random generation (min 20 chars for passwords)
- [ ] AES_MASTER_KEY is 32 bytes (44 chars base64)
- [ ] DB password ≠ RabbitMQ password ≠ MinIO password
- [ ] JWT_PRIVATE_KEY never exposed outside Core-Service
- [ ] GCP service account never committed to git
- [ ] HTTPS enabled for all external APIs
- [ ] CORS properly configured (not wildcard)
- [ ] Health check endpoints have proper auth
- [ ] Secret rotation planned (quarterly minimum)
- [ ] Audit logging enabled for all data changes
- [ ] Database backups scheduled
- [ ] Load balancer configured with circuit breakers

### Monitoring Post-Deployment ✅

- [ ] Check logs for JWT validation errors (indicates key mismatch)
- [ ] Monitor AES decryption failures (key corruption)
- [ ] Alert on failed RabbitMQ connections (auth issue)
- [ ] Verify MinIO bucket access (storage failures)
- [ ] Test token refresh flow (expiration handling)

---

## Quick Reference: Required Environment Variables

```bash
# MUST SET (production will fail without these):
SPRING_DATASOURCE_PASSWORD=
JWT_PRIVATE_KEY_PATH=
JWT_PUBLIC_KEY_PATH=
AES_MASTER_KEY=
SPRING_RABBITMQ_PASSWORD=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GCP_SERVICE_ACCOUNT_JSON=

# CAN OMIT (has defaults):
SPRING_DATASOURCE_URL=
JWT_EXPIRATION=
MINIO_ENDPOINT=
```

---

## Generating Secrets Securely

```bash
#!/bin/bash
# Generate all required secrets (run once, save to secure vault)

echo "Generating secure passwords..."
DB_PASSWORD=$(openssl rand -base64 20)
RABBITMQ_PASSWORD=$(openssl rand -base64 32)
MINIO_ACCESS_KEY=$(openssl rand -base64 20)
MINIO_SECRET_KEY=$(openssl rand -base64 32)
AES_MASTER_KEY=$(openssl rand -base64 32)

echo "DATABASE_PASSWORD=$DB_PASSWORD"
echo "RABBITMQ_PASSWORD=$RABBITMQ_PASSWORD"
echo "MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY"
echo "MINIO_SECRET_KEY=$MINIO_SECRET_KEY"
echo "AES_MASTER_KEY=$AES_MASTER_KEY"

echo ""
echo "Save these to .env (local) or Vault (production). DO NOT COMMIT!" 
```

---

## Vault Integration (Recommended for Production)

Instead of environment files, use HashiCorp Vault:

```bash
# Store secrets in Vault
vault kv put secret/nexusaid/database \
  password=$DB_PASSWORD \
  username=postgres \
  url="jdbc:postgresql://postgres:5432/nexusaiddb"

# Spring Boot integration
SPRING_CLOUD_VAULT_ENABLED=true
SPRING_CLOUD_VAULT_URI=https://vault.yourdomain.com:8200
SPRING_CLOUD_VAULT_TOKEN=[REQUIRED]
SPRING_CLOUD_VAULT_NAMESPACE=nexusaid
```

---

## Troubleshooting

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `java.nio.file.NoSuchFileException: private.pem` | JWT key not found | Set `JWT_PRIVATE_KEY_PATH` env var |
| `io.jsonwebtoken.security.SignatureException` | Public/private key mismatch | Regenerate both keys together |
| `javax.crypto.BadPaddingException` | AES_MASTER_KEY wrong | Check base64 encoding, must be 44 chars |
| `org.springframework.amqp.AmqpAuthenticationException` | RabbitMQ password wrong | Verify SPRING_RABBITMQ_PASSWORD |
| `Database Connection Failed` | DB password wrong or DB unreachable | Check SPRING_DATASOURCE_PASSWORD and host |
| `InvalidKeySpecException` | JWT key format wrong | Ensure PEM files use proper OpenSSL format |

---

**Date**: April 15, 2026  
**Version**: 2.0 (PHASE 3 Security Hardening)  
**Audience**: DevOps, SRE, Security, Backend Engineers
