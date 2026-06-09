# 🌐 Variables d'Environnement de Production — Guide de Déploiement VPS
## 📋 Cartographie Complète et Configuration pour le Déploiement Production

Ce document contient l'ensemble des configurations d'environnement de production nécessaires au déploiement de l'architecture microservices de la plateforme **NexusAid** sur un serveur VPS. 

---

## 🔍 Architecture de Configuration & Flux de Variables

L'architecture NexusAid utilise un double mécanisme de configuration :
1. **Variables d'Environnement Système (Docker / OS)** : Injectées via le fichier `.env` principal chargé par le fichier [docker-compose.yml](file:///d:/PFE/Developpment/platforme%20nexus%20aid/docker-compose.yml).
2. **Spring Cloud Config Server** : Le service [config-server](file:///d:/PFE/Developpment/platforme%20nexus%20aid/config-server/) lit dynamiquement les fichiers de configuration centralisés (sous `src/main/resources/config/`) et résout les placeholders (comme `${VAR_NAME}`) à partir des variables d'environnement injectées dans le conteneur.

---

## 📂 Structure Recommandée sur le Serveur VPS

Lors du déploiement sur votre VPS (par exemple sous `/var/www/nexusaid/`), structurez vos fichiers de la manière suivante afin de garantir la bonne résolution des paths :

```bash
/var/www/nexusaid/
├── docker-compose.yml       # Fichier d'orchestration de production
├── .env                     # Fichier d'environnement de production unique (Contient les secrets)
├── config/
│   ├── private.pem          # Clé privée RSA pour la signature JWT (Core-Service)
│   ├── public.pem           # Clé publique RSA pour la vérification JWT (Admin, Gateway, MS4)
│   └── detection-key.json   # Clé de compte de service Google Cloud (Earth Engine)
├── postgres-init/           # Scripts d'initialisation des bases de données SQL
└── data/                    # Volumes persistants pour PostgreSQL, MinIO, etc.
```

---

## 🛠️ Génération Sécurisée des Clés et Secrets de Production

Avant de configurer votre fichier `.env` sur le VPS, exécutez ces commandes pour générer des secrets cryptographiques robustes :

```bash
# 1. Générer le mot de passe de la Base de Données et de RabbitMQ (20+ caractères)
openssl rand -base64 24

# 2. Générer la clé maîtresse AES-256 (Doit faire exactement 32 octets, soit 44 caractères Base64)
# Utilisé par admin-service pour le chiffrement symétrique des données sensibles
openssl rand -base64 32

# 3. Générer la paire de clés RSA (JWT RS256)
# Génère la clé privée (private.pem)
openssl genrsa -out private.key 2048
openssl pkcs8 -topk8 -inform PEM -outform PEM -in private.key -out private.pem -nocrypt
# Extrait la clé publique correspondante (public.pem)
openssl rsa -in private.pem -pubout -out public.pem
# Nettoyage de la clé intermédiaire
rm private.key
```

---

## 📝 Modèle Master `.env.production` (À copier sur le VPS)

Voici le fichier `.env` complet prêt pour la production à placer à la racine de votre dossier de déploiement sur le VPS. Vous devez y remplacer les placeholders par vos valeurs réelles.

```env
# ==============================================================================
# 🔐 NEXUS-AID — CONFIGURATION DE PRODUCTION PRINCIPALE (VPS)
# ==============================================================================

# ─── 🗄️ BASES DE DONNÉES & INFRASTRUCTURE
# Mot de passe root pour PostgreSQL
DB_PASSWORD=Changer_Ce_Mot_De_Passe_De_Production_Ultra_Securise_2026

# Identifiants de connexion pour le stockage d'objets MinIO
MINIO_ACCESS_KEY=admin_prod_access_key
MINIO_SECRET_KEY=Changer_Ce_Secret_Minio_Ultra_Securise_40_Caracteres

# ─── 🔑 SECRETS CRYPTOGRAPHIQUES (JWT & AES)
# Clé maîtresse AES-256 (Générée avec 'openssl rand -base64 32' - 44 caractères)
AES_MASTER_KEY=Changer_Ce_Master_Key_AES_De_Production_32_Bytes=

# Clé de signature JWT symétrique (Fallback / Secours)
JWT_SECRET=Changer_Ce_Secret_JWT_Hexadecimal_De_Production_64_Caracteres_2026

# Emplacements absolus ou relatifs des clés PEM RSA dans le conteneur
JWT_PRIVATE_KEY_PATH=/app/config/private.pem
JWT_PUBLIC_KEY_PATH=/app/config/public.pem
# Durée de validité du Token JWT (86400000 ms = 24 heures)
JWT_EXPIRATION=86400000

# ─── ✉️ MESSAGE BROKER (RABBITMQ)
RABBITMQ_USER=nexusaid_prod_user
RABBITMQ_PASS=Changer_Ce_Mot_De_Passe_RabbitMQ_De_Production

# ─── ☁️ INTÉGRATIONS CLOUD & API TIERS
# Cloudinary (Gestion et CDN d'images - Core Service)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# OpenRouter AI (Intelligence Artificielle)
OPENROUTER_API_KEY=votre_openrouter_api_key

# Google Earth Engine (GEE - Détection des catastrophes)
GEE_SERVICE_ACCOUNT=votre-compte-service@votre-projet.iam.gserviceaccount.com
GEE_PRIVATE_KEY_PATH=/app/config/detection-key.json

# OpenWeather API (Données météo en temps réel)
OPENWEATHER_API_KEY=votre_openweather_api_key

# Twilio (Alertes SMS en cas de crise)
TWILIO_ACCOUNT_SID=votre_twilio_account_sid
TWILIO_AUTH_TOKEN=votre_twilio_auth_token
TWILIO_PHONE_NUMBER=votre_numero_de_telephone_twilio

# SendGrid (Envoi d'e-mails d'alerte)
SENDGRID_API_KEY=votre_sendgrid_api_key
ALERT_EMAIL_FROM=alerts@votre-domaine.com

# Configuration SMTP (Envoi d'e-mails généraux et onboarding - Core Service)
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=votre_email@gmail.com
SPRING_MAIL_PASSWORD=votre_mot_de_passe_application_smtp

# ─── 🛡️ SÉCURITÉ: reCAPTCHA Enterprise & Cloudflare
RECAPTCHA_ENABLED=true
RECAPTCHA_SITE_KEY=votre_site_key_recaptcha
RECAPTCHA_SECRET_KEY=votre_secret_key_recaptcha
VITE_RECAPTCHA_SITE_KEY=votre_site_key_recaptcha

CLOUDFLARE_ACCOUNT_ID=votre_account_id_cloudflare
CLOUDFLARE_API_TOKEN=votre_api_token_cloudflare

# ─── 🌐 FRONTEND, RÉSEAU & DOMAINES
# Origines CORS autorisées (Pas d'astérisque '*' en production !)
ALLOWED_ORIGINS=https://votre-domaine.com,https://api.votre-domaine.com

# Configuration des URLs de routage du Gateway
VITE_API_BASE_URL=https://api.votre-domaine.com/api
VITE_WS_URL=wss://api.votre-domaine.com/ws
VITE_API_TIMEOUT=15000
VITE_APP_VERSION=1.0.0
VITE_DEFAULT_LANGUAGE=fr
VITE_ENABLE_AI=true
VITE_ENABLE_OFFLINE=true

# Environnement applicatif
SPRING_PROFILES_ACTIVE=production
ENVIRONMENT=production
LOG_LEVEL=INFO
```

---

## 🗂️ Détails par Service et Emplacements des Fichiers

### 1. Registry Service : Eureka Server
* **Emplacement Code Source** : [eureka-server](file:///d:/PFE/Developpment/platforme%20nexus%20aid/eureka-server/)
* **Fichier de Configuration** : `src/main/resources/application.yml`
* **Port de Production (Interne)** : `8761` (Exposé sur le VPS sous le port `9761`)
* **Variables Clés** :
  * `SERVER_PORT` : Fixé à `8761` pour le fonctionnement interne du réseau Docker.

---

### 2. Centralized Config Service : Config Server
* **Emplacement Code Source** : [config-server](file:///d:/PFE/Developpment/platforme%20nexus%20aid/config-server/)
* **Fichier de Configuration** : `src/main/resources/application.yml`
* **Port de Production (Interne)** : `8888` (Exposé sur le VPS sous le port `9888`)
* **Variables Clés** :
  * `EUREKA_CLIENT_SERVICEURL_DEFAULTZONE` : URL d'enregistrement Eureka (`http://eureka-server:8761/eureka/`).

---

### 3. API Gateway Service : Spring Cloud Gateway
* **Emplacement Code Source** : [api-gateway](file:///d:/PFE/Developpment/platforme%20nexus%20aid/api-gateway/)
* **Fichiers de Configuration** : 
  * Bootstrap local : `src/main/resources/application.yml`
  * Centralisé sur Config Server : [api-gateway.yml](file:///d:/PFE/Developpment/platforme%20nexus%20aid/config-server/src/main/resources/config/api-gateway.yml)
* **Port de Production (Externe)** : `8060` (Sert de point d'entrée unique pour le trafic HTTP/WebSocket vers les microservices).
* **Variables Clés** :
  * `DISASTER_DETECTION_URL` : Adresse de l'API de détection (`http://disaster-detection:8000`).
  * `DISASTER_DETECTION_WS_URL` : Adresse WebSocket de détection (`ws://disaster-detection:8000`).
  * `FRONTEND_URL` : Adresse de diffusion des fichiers statiques du frontend (`http://nexus-aid-frontend:80`).
  * `ALLOWED_ORIGINS` : Liste des domaines autorisés par le CORS de production.
  * `JWT_PUBLIC_KEY` / `JWT_PUBLIC_KEY_PATH` : Clé publique RSA pour valider les tokens des utilisateurs.

---

### 4. Core Microservice (MS1 : Social, Organes & Ressources)
* **Emplacement Code Source** : [core-service](file:///d:/PFE/Developpment/platforme%20nexus%20aid/core-service/)
* **Fichiers de Configuration** :
  * Bootstrap local : `src/main/resources/application.yml`
  * Centralisé sur Config Server : [core-service.yml](file:///d:/PFE/Developpment/platforme%20nexus%20aid/config-server/src/main/resources/config/core-service.yml)
  * Fichier local d'environnement : `core-service/.env` (reproduit les variables du `.env` principal)
* **Port de Production (Interne)** : `8080` (Exposé sur le VPS sous le port `9082`)
* **Variables Clés** :
  * `SPRING_DATASOURCE_PASSWORD` : Récupère `DB_PASSWORD` pour se connecter à la base PostgreSQL `nexusaid_db`.
  * `RABBITMQ_USER` & `RABBITMQ_PASS` : Identifiants de connexion au serveur RabbitMQ.
  * `JWT_PRIVATE_KEY` / `JWT_PRIVATE_KEY_PATH` : Clé privée RSA indispensable pour générer et signer les tokens.
  * `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` : Identifiants de stockage des photos.
  * `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` : Configuration SMTP pour l'envoi de mails d'onboarding/système.

---

### 5. Admin & Reporting Microservice (MS3 : Validation, Templates & Dons)
* **Emplacement Code Source** : [admin-service](file:///d:/PFE/Developpment/platforme%20nexus%20aid/admin-service/)
* **Fichiers de Configuration** :
  * Bootstrap local : `src/main/resources/application.yml`
  * Centralisé sur Config Server : [admin-service.yml](file:///d:/PFE/Developpment/platforme%20nexus%20aid/config-server/src/main/resources/config/admin-service.yml)
* **Port de Production (Interne)** : `8081` (Exposé sur le VPS sous le port `9081`)
* **Variables Clés** :
  * `SPRING_DATASOURCE_URL` : URL de connexion vers la base administrative (`jdbc:postgresql://postgres-db:5432/nexusaid_admin`).
  * `AES_MASTER_KEY` : Clé symétrique obligatoire pour sécuriser l'écriture des transactions financières et des rapports.
  * `JWT_PUBLIC_KEY` / `JWT_PUBLIC_KEY_PATH` : Clé publique RSA pour la vérification des droits d'administration.

---

### 6. Disaster Detection Microservice (MS4 : Python Daemon + FastAPI)
* **Emplacement Code Source** : [disaster-detection](file:///d:/PFE/Developpment/platforme%20nexus%20aid/disaster-detection/)
* **Fichiers de Configuration** :
  * Modèle de variables : `.env.example`
  * Chargé en production : via le fichier `.env` global monté dans le répertoire `/app/config` du conteneur.
* **Port de Production (Interne)** : `8000` (Exposé de manière sécurisée en interne aux autres conteneurs et au Gateway).
* **Variables Clés** :
  * `GEE_SERVICE_ACCOUNT` & `GEE_PRIVATE_KEY_PATH` : Configuration obligatoire pour l'API Google Earth Engine.
  * `DATABASE_URL` : Connexion directe PostgreSQL (`postgresql://postgres:password@postgres-db:5432/nexusaid_db`).
  * `RABBITMQ_URL` : URL amqp de connexion au broker de messages (`amqp://nexusaid:password@rabbitmq:5672/`).
  * `OPENWEATHER_API_KEY` : Clé de récupération des alertes météo mondiales.
  * `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` : Configuration d'envoi d'alertes par SMS.
  * `SENDGRID_API_KEY`, `ALERT_EMAIL_FROM` : Configuration d'envoi d'alertes par e-mail.
  * `JWT_PUBLIC_KEY_PATH` : Clé publique RSA pour valider les jetons lors de l'accès aux salles de crise.

---

### 7. PDF Rendering Service (Microservice Utilitaire Node.js)
* **Emplacement Code Source** : [pdf-service](file:///d:/PFE/Developpment/platforme%20nexus%20aid/pdf-service/)
* **Fichier de Configuration** : [index.js](file:///d:/PFE/Developpment/platforme%20nexus%20aid/pdf-service/index.js) (lit directement l'objet `process.env`)
* **Port de Production (Interne)** : `3001` (Exposé sur le VPS sous le port `3001` pour la génération des reçus PDF).
* **Variables Clés** :
  * `PORT` : Fixé à `3001`.
  * `CHROMIUM_PATH` : Chemin vers Chromium sans tête (`/usr/bin/chromium-browser`).
  * `EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE` : Lien vers le registre Eureka.

---

### 8. Frontend Application (React SPA + Nginx)
* **Emplacement Code Source** : [nexus-aid-frontend](file:///d:/PFE/Developpment/platforme%20nexus%20aid/nexus-aid-frontend/)
* **Fichiers de Configuration** :
  * Fichier local d'environnement : `.env`
* **Port de Production (Externe)** : Serveur Nginx interne fonctionnant sur le port `80` (Exposé sur le VPS sous le port `9173` ou routé directement via un reverse proxy comme Nginx/Certbot sur le port `80`/`443`).
* **Variables Clés** :
  * `VITE_API_BASE_URL` : Point de terminaison de l'API REST (/api) redirigé par le Gateway.
  * `VITE_WS_URL` : Point de terminaison du WebSocket pour le centre de commandement en temps réel.
  * `VITE_RECAPTCHA_SITE_KEY` : Clé de validation des formulaires.

---

### 9. CPR Assistant - Mobile Backend (Python / FastAPI)
* **Emplacement Code Source** : [code source app mobile](file:///d:/PFE/Developpment/code%20source%20app%20mobile/)
* **Fichiers de Configuration** :
  * Dockerfile de service : [Dockerfile](file:///d:/PFE/Developpment/code%20source%20app%20mobile/Dockerfile)
  * Code source du serveur : [server.py](file:///d:/PFE/Developpment/code%20source%20app%20mobile/server.py)
* **Port de Production (Interne)** : `8000` (Exposé sur le VPS sous le port `8000` ou `8082` selon le compose spécifique mobile).
* **Variables Clés** :
  * `EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE` : URL de découverte du service Eureka.

---

## 🔒 Résumé des Variables Sensibles (Secrets de Production)

Pour que la production soit stable et sécurisée sur le VPS, assurez-vous que les variables suivantes **ne possèdent jamais leurs valeurs par défaut (`postgres`, `guest`, `minioadmin`)** :

| Variable d'Environnement | Type de Secret | Service Consommateur | Action Requise avant VPS |
| :--- | :--- | :--- | :--- |
| `DB_PASSWORD` | Mot de passe | `postgres-db`, `core`, `admin` | Générer un mot de passe alphanumérique unique |
| `MINIO_SECRET_KEY` | Clé Secrète | `minio`, `admin-service` | Générer une clé d'accès de 40 caractères |
| `RABBITMQ_PASS` | Mot de passe | `rabbitmq`, `core`, `admin`, `disaster` | Modifier le mot de passe utilisateur broker |
| `AES_MASTER_KEY` | Clé Chiffrement | `admin-service` | Générer une clé AES 256 bits encodée en Base64 |
| `JWT_PRIVATE_KEY` | Fichier PEM | `core-service` | Générer un couple de clés RSA 2048 bits |
| `CLOUDINARY_API_SECRET` | Clé Privée API | `core-service` | Renseigner le secret fourni par Cloudinary |
| `OPENROUTER_API_KEY` | Clé Privée API | `core-service` | Clé d'API AI pour l'assistant |
| `GEE_PRIVATE_KEY_PATH` | Fichier JSON | `disaster-detection` | Télécharger et copier le fichier JSON Google Cloud |
| `TWILIO_AUTH_TOKEN` | Jeton d'API | `disaster-detection` | Configurer l'accès Twilio SMS |
| `SENDGRID_API_KEY` | Clé Privée API | `disaster-detection` | Configurer l'envoi d'e-mails sécurisé |
| `SPRING_MAIL_PASSWORD` | Mot de passe App | `core-service` | Mot de passe d'application SMTP pour l'envoi de mails |

---

## 🚀 Guide Rapide de Lancement sur le VPS

Une fois tous les fichiers copiés dans `/var/www/nexusaid/` et les clés PEM créées dans `/var/www/nexusaid/config/` :

```bash
# 1. Naviguez dans le dossier de déploiement
cd /var/www/nexusaid/

# 2. Vérifiez la présence du fichier .env et des clés
ls -la
ls -la config/

# 3. Lancez la stack entière en tâche de fond (tous les microservices se baseront sur le .env de production)
docker-compose up -d --build

# 4. Vérifiez l'état de santé des conteneurs
docker-compose ps

# 5. Surveillez les journaux des microservices
docker-compose logs -f core-service
docker-compose logs -f disaster-detection
```
