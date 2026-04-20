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
AES_KEY=MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=

# ─── JWT RSA SECRETS ────────────────────────────────
# Private Token Signing Key
JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC06oSTjEOEUPls\n0Alg1/hub5XEKKpUJkYbH9qxaJyBnki/FYZ0s/GsPxPWDcFvz9H3BDhsRpAtb5hT\niUYuQ7SWRmre2u99E7slDInHWcsE5MVzIgRtvCcNFNgDIGXr4YtoP/DIYt294foV\nI+wdBx8/qeEmtERUX/ihQcPu77aGCNgbgNQsNuuRCv3nYyu5vt3TcSCDTXVpCb3D\nH99Km2iOzRdn0tfblSS1jFNmj9h9cP6FFs9Cz7ohyPcQd6bnJ2yU9mnNudSS1XYT\nESx5Bb12VudX1CMNpIbMPqCzJoCnz87Au3xu+St26tGpXs6cRyRAwO8ApR9kDJwO\nZSHLQbxHAgMBAAECggEAAeGcblJbk2EqLtT8+/pS9YcIhiksGELroLWUlxqw4fIs\n7HvDUaxbW4Cuap/q/ogpNUngclPLhQVvjpLTXYDLvHJQAzBApErTu99lAWMwJsVg\nPkHAzQlTWKH6WxH3rVvDkNp1XQgWKTbT3GtqtaSQ0R8pnbbrLPtwgPDHolDw03T4\nmHMJrde56SYvpFlspMak0DS5fz2pBxnMJf/1GTInDD19vs3QaswSTUHAb97d9Sic\ngm2UHzOqRxv7XCdF3MeJ2c+GKFxNLtiuC4bPbR2ooU4ZiAh2G/J2dPZNMOWhqhJW\n/0VIHdLOClrV0i1yxHKz2XjHaWbwI5ew7DLEnJadNQKBgQDqHl5kSwEYBLHAnTZK\nus0mSr2YagL3QYfaFLUT53nJToTKb7WaJ8fx3UKhGte84o1ld9Zjh3NVBneDI7pW\nQK32GG3Q0ruk+3IxKjk1EACo63shOvG6OicRW1BXIb4WdH4DMy6ap0sdNS3HQV7s\ntZmSFuHeOGMWVizUnvUoy75QXQKBgQDF0zNK7IPdXJsOIiT+OH9M6HnLWge3J2Ke\nE2zS16yEnu321himdvOqLPmcpoKktGgi5caxrwtzp1XIxN8d60ERTsCUhB4ZX3f4\nY4uKgHcu2dhER1Wtml2QtBLa3ertaTj6F05hRVyXroiSkliN++m/7Sgr8sMNjOep\nbOyRwCIE8wKBgGmE2oJVk96hbwQjV28DFqellCJ31XJfpL1UC/E2qRtkOlGLW8xp\nFaMbWIaINKg7bANJqeUeDYtK6N7AYaGycTWz+PrfoBdSBTvHjhUuaz23NL3bdUu8\nHhOilmlPGf/A7XK/xMeLkz1M1J80BXamutqvWYnw3CgbGwWRx2lluxc5AoGBAKYy\naI5So/oOOgomr3OQ3YosaV5pVcAO67AoW63LGhoVN5C/j9gSaWWYAWEVFv7uvepL\npqFSkUlp1Q0mMNh+85xp0Cs1z9+7MBxS7UG/6eFHjYTXdWizHlZaotiTxjIMy5x4\nhhX8Yuzf6cdSAenPMTNYN/6sJii1L09Mvnc4tpv3AoGAVipt21kMQbmzuPdaZWad\nUzIkDqAA0uW9QaucQ6JNvyIWo+bOPsynOFUXN6dgRHRIuOm1Jy1n2olNK0rQ9eiq\nX0myoCWFUXBUd7vg/f3ylcKSd1J12afA61/pmaBJRwdgCOk1Wr5FmUe33fx0h5jV\n01YQT4V5kSiYRLrrtHGQwRo=\n-----END PRIVATE KEY-----

# Public Verification Key
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtOqEk4xDhFD5bNAJYNf4\nbm+VxCiqVCZGGx/asWicgZ5IvxWGdLPxrD8T1g3Bb8/R9wQ4bEaQLW+YU4lGLkO0\nlkZq3trvfRO7JQyJx1nLBOTFcyIEbbwnDRTYAyBl6+GLaD/wyGLdveH6FSPsHQcf\nP6nhJrREVF/4oUHD7u+2hgjYG4DULDbrkQr952Mrub7d03Egg011aQm9wx/fSpto\njs0XZ9LX25UktYxTZo/YfXD+hRbPQs+6Icj3EHem5ydslPZpzbnUktV2ExEseQW9\ndlbnV9QjDaSGzD6gsyaAp8/OwLt8bvkrdurRqV7OnEckQMDvAKUfZAycDmUhy0G8\nRwIDAQAB\n-----END PUBLIC KEY-----

JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# ─── MESSAGE BROKER ─────────────────────────────────
RABBITMQ_USER=nexusaid
RABBITMQ_PASS=nexusaid_secure_2026

# ─── CLOUD INTEGRATIONS ─────────────────────────────
# Cloudinary (Module 1 - Core Service)
CLOUDINARY_CLOUD_NAME=dznkfxwsd
CLOUDINARY_API_KEY=726734694395147
CLOUDINARY_API_SECRET=OSKkrluMhxyD2ZIfEutLyR5RV28

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
