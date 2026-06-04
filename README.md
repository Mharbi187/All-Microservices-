# Ultimate Application .env Configuration & Setup Guide

## How to Set Up the Project (Instructions for Colleague)

Follow these steps precisely to launch the entire Nexus-AID microservices architecture on your local machine using the pre-built Docker containers we pushed to GitHub Container Registry (GHCR):

1. **Pull the Latest Branch**
   Pull the latest main branch from the repository:
   ```bash
   git pull origin main
   ```

2. **Create the Environment File**
   Create a file named `.env` in the **root** folder of your repository. 
   Copy and paste the Ultimate Master Environment variables provided below into this new `.env` file.

3. **Provide Google Earth Engine Credentials**
   For the Disaster Detection microservice to work in real-time, you need the Google Earth Engine service account key JSON file.
   - Obtain the Google Earth Engine private key JSON file (e.g. `detection-478419-fa67745b4754.json`) from the project administrator.
   - Place this JSON file securely inside the `Distaster Detection/` folder. Do not commit it to version control.

4. **Launch the Production-Ready Cluster**
   Start all microservices using the specialized local production orchestration script. This will download the latest images we configured via CI/CD for every microservice:
   ```bash
   docker-compose -f docker-compose-local.yml up -d
   ```

5. **Verify the Deployment**
   - Check the statuses of your containers using `docker-compose -f docker-compose-local.yml ps`.
   - Access the Main Application at `http://localhost:5173`.
   - The API Gateway is exposed at `http://localhost:8060`.
   - Wait ~60 seconds for `eureka-server` and `config-server` to boot fully before backend logic starts taking effect.

---

## The Ultimate .env File

Share this securely. Drop this right into the **ROOT** directory named `.env` to securely cover the entire NexusAid architecture.

```env
# ============================================================
# NEXUS-AID — Ultimate Master Environment Variables
# Combines:
# - Root Microservices environment
# - Frontend environment
# - Disaster Detection Python daemon environment
# ============================================================

# ─── CORE INFRASTRUCTURE & CREDENTIALS ──────────────
# PostgreSQL
DB_PASSWORD=postgres

# MinIO Object Storage
MINIO_PASSWORD=minioadmin

# AES-256 Master Key (Base64 encoded, 32 bytes)
AES_KEY=<REPLACE_WITH_BASE64_AES_KEY>

# ─── JWT RSA SECRETS ────────────────────────────────
# Private Token Signing Key
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n<REPLACE_WITH_PRIVATE_KEY>\n-----END PRIVATE KEY-----

# Public Verification Key
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n<REPLACE_WITH_PUBLIC_KEY>\n-----END PUBLIC KEY-----

JWT_SECRET=<REPLACE_WITH_JWT_SECRET>

# ─── MESSAGE BROKER ─────────────────────────────────
RABBITMQ_USER=nexusaid
RABBITMQ_PASS=nexusaid_secure_2026

# ─── CLOUD INTEGRATIONS ─────────────────────────────
# Cloudinary (Module 1 - Core Service)
CLOUDINARY_CLOUD_NAME=<REPLACE_ME>
CLOUDINARY_API_KEY=<REPLACE_ME>
CLOUDINARY_API_SECRET=<REPLACE_ME>

# OpenRouter AI
OPENROUTER_API_KEY=CHANGE_ME_openrouter_key

# ─── DISASTER DETECTION (MODULE 4) ──────────────────
# Google Earth Engine
GEE_SERVICE_ACCOUNT=mohamedharbi@detection-478419.iam.gserviceaccount.com
GEE_PRIVATE_KEY_PATH=./detection-478419-fa67745b4754.json

# OpenWeather API
OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY_HERE

# Twilio (SMS)
TWILIO_ACCOUNT_SID=replace_me
TWILIO_AUTH_TOKEN=replace_me
TWILIO_PHONE_NUMBER=+10000000000
TWILIO_AUTH_TOKEN=replace_me
TWILIO_PHONE_NUMBER=+10000000000

# SendGrid (Email)
SENDGRID_API_KEY=replace_me
ALERT_EMAIL_FROM=alerts@example.org

# ─── FRONTEND & GATEWAY ─────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
VITE_API_BASE_URL=/api
VITE_API_TIMEOUT=15000
VITE_APP_VERSION=1.0.0
VITE_DEFAULT_LANGUAGE=fr
VITE_ENABLE_AI=true
VITE_ENABLE_OFFLINE=true
```
