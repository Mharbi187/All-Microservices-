# 🛠️ Cartographie Complète des Stacks Technologiques — Nexus-AID & Vision-CPR

Ce document présente une analyse exhaustive et structurée de l'ensemble de l'écosystème technologique du projet **Nexus-AID** (Plateforme de coordination et de gestion des catastrophes pour le Croissant-Rouge Tunisien) ainsi que de l'application mobile et du système de vision IA d'assistance RCP (**CPR-Vision**).

---

## 🏗️ 1. Architecture Globale & Patron d'Orchestration

L'écosystème est conçu selon une architecture microservices décentralisée et conteneurisée.
* **Gestion des sources** : Architecture **Branch-per-Service** (le code source de chaque service est hébergé sur une branche Git dédiée).
* **Orchestration & Déploiement** : Conteneurisation complète via **Docker** & **Docker Compose** pour l'orchestration des microservices, bases de données, brokers de messages et composants d'infrastructure.
* **Réseaux partagés** : Réseau interne `nexus-aid-net` partagé avec le stack de monitoring pour la communication inter-services par nom d'hôte.

---

## 💻 2. Plateforme Web & Backend (Nexus-AID)

L'infrastructure backend repose principalement sur l'écosystème **Spring Cloud** pour les microservices Java, complété par des services spécialisés en **Python** (FastAPI) et **Node.js** (Puppeteer).

### A. Infrastructure Spring Cloud & Services Java 21 (Spring Boot 3.4.3)

| Microservice / Composant | Technologie Principale | Port Interne | Port Externe | Rôle & Description |
| :--- | :--- | :--- | :--- | :--- |
| **Eureka Server** | Spring Cloud Netflix Eureka | `8761` | `9761` | Annuaire et registre de découverte dynamique de services. |
| **Config Server** | Spring Cloud Config | `8888` | `9888` | Gestion centralisée et dynamique des configurations (`application.yml`). |
| **API Gateway** | Spring Cloud Gateway (Reactive/WebFlux) | `8060` | `8060` | Point d'entrée unique, routage dynamique, rate-limiting (Redis), circuit breakers (Resilience4j). |
| **Core Service (MS1)** | Spring Boot 3.4.3, Spring Security, Spring Data JPA | `8080` | `9082` | Gestion des profils (volontaires, staff), des comités locaux, de l'inventaire, et des interventions. |
| **Admin Service (MS3)** | Spring Boot 3.4.3, Spring Security, Spring Data JPA | `8081` | `9081` | Gestion administrative, rapports mensuels, intégration de stockage d'objets et gestion des dons. |

* **Dépendances clés (Java)** :
  * `spring-boot-starter-web` & `spring-boot-starter-webflux`
  * `spring-boot-starter-security` & JSON Web Tokens (JJWT `0.12.5`) pour la sécurité.
  * `spring-cloud-starter-netflix-eureka-client` & `spring-cloud-starter-config`
  * `spring-boot-starter-amqp` (Intégration RabbitMQ)
  * `lombok` & `spring-boot-starter-actuator`

### B. Microservices Spécialisés

#### 1. Disaster Detection (MS4 — IA & Alerte)
* **Stack** : Python 3.x, **FastAPI**, **Uvicorn** (Serveur ASGI).
* **Port** : `8000` (exposé en interne).
* **Rôle** : Détection des feux/inondations, gestion de crise, dispatching d'équipes et estimation des ressources logistiques en temps réel.
* **Bibliothèques clés** :
  * *Données Satellite* : `earthengine-api` (Google Earth Engine), `geemap`, `rasterio`, `geopandas`.
  * *Machine Learning* : `scikit-learn` (Classifieur Random Forest), `xgboost` (Modèle de risque), `pandas`, `numpy`, `imbalanced-learn` (SMOTE pour le rééquilibrage de classes).
  * *Alertes* : `twilio` (SMS), `sendgrid` (Mails), `pika` (RabbitMQ).
  * *Communication temps réel* : FastAPI WebSockets (gestionnaire de connexions par room de crise).

#### 2. PDF Service (Génération de Documents)
* **Stack** : Node.js (v20+), **Express**, **Puppeteer-core** (Chromium).
* **Port** : `3001` (externe `3001`).
* **Rôle** : Microservice de conversion HTML-vers-PDF (utilisé pour les bilans d'intervention, attestations et rapports mensuels).
* **Service Discovery** : Intégration Eureka via `eureka-js-client`.

#### 3. WhatsApp Webhook Bridge
* **Stack** : Python, **Flask**, `requests`.
* **Port** : `5001`.
* **Rôle** : Passerelle de réception et routage d'alertes via WhatsApp en communiquant avec le serveur OpenWA.

---

## 🗄️ 3. Stockage, Caching & Messagerie (Infrastructure Partagée)

| Technologie / Service | Image Docker | Port Interne | Port Externe | Description & Utilisation |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `postgres:15-alpine` | `5432` | `5433` | Base de données relationnelle principale avec deux instances logiques : `nexusaiddb` (Core-service) et `nexusaid_admin` (Admin-service). |
| **Redis** | `redis:7-alpine` | `6379` | `6380` | Cache haute performance utilisé pour le rate limiting au niveau de l'API Gateway. |
| **RabbitMQ** | `rabbitmq:3-management-alpine` | `5672`, `15672` | `5673`, `15673` | Broker de messages asynchrones (AMQP) pour la communication inter-services. |
| **MinIO** | `minio/minio:latest` | `9000`, `9001` | `9000`, `9001` | Stockage d'objets compatible S3 (fichiers de dons, reçus QR, templates PDF). |
| **Cloudinary** | *SaaS Externe* | - | - | Hébergement et traitement dynamique des images et des fichiers audio (messages vocaux de crise). |

### Structure des files de messages (RabbitMQ) :
* `nexusaid.intervention.alerts` : Alertes de création d'interventions pour audit et affectation.
* `nexusaid.stock.alerts` : Notification de niveau de stock bas.
* `nexusaid.disaster.alerts` : Alertes envoyées par l'agent IA Python (MS4) pour créer automatiquement des interventions et des brouillons de rapports administratifs.
* `nexusaid.report.published` : Propagation de la publication d'un rapport vers les services analytiques.
* `nexusaid.dlq` : Gestion des messages d'erreur (Dead Letter Queue).

---

## 🎨 4. Frontend Web (Nexus-AID Frontend)

* **Framework Principal** : **React 19**
* **Langage** : **TypeScript 5.9**
* **Outil de Build** : **Vite 7** (compilation ES rapide)
* **Serveur de Production** : Image Docker avec **Nginx** (Reverse Proxy).
* **Port** : `80` (mappé vers le port externe `9173` ou `5173` en dev).

### Dépendances UI & Librairies majeures :
* **Composants UI** : **Ant Design (antd v5.29.3)**, `@ant-design/icons`, `@ant-design/pro-components`.
* **Visualisation cartographique** : `leaflet` & `react-leaflet` (Cartographie en temps réel des zones de crise et des équipes déployées).
* **Gestion d'état global** : **Zustand (v5.0.11)** (alternative légère et réactive à Redux).
* **Requêtes HTTP & Cache** : `axios` & **@tanstack/react-query (v5.90.2)** (pour la mise en cache des requêtes d'API).
* **Animations** : `framer-motion (v12.34.3)` (pour les micro-interactions).
* **Visualisation de Données & Graphiques** : `@ant-design/charts` et `echarts`.
* **Internationalisation** : `i18next` & `react-i18next` (support multilingue Français/Arabe prêt).
* **Utilitaires PDF / Capture** : `jspdf`, `html2canvas` (pour l'export de rapports côté client).

---

## 📱 5. Application Mobile & Vision IA (Système CPR-Vision)

Ce sous-projet gère l'application d'assistance et de formation RCP (Réanimation Cardio-Pulmonaire) en temps réel avec reconnaissance de pose par IA.

### A. Application Mobile
* **Framework** : **React Native (v0.81.5)** via **Expo (v54.0)**.
* **Langages** : TypeScript / JavaScript.
* **Composants d'intégration matérielle** :
  * `expo-camera` & `react-native-vision-camera` (Capture vidéo en temps réel).
  * `expo-av` (Gestion audio / métronome pour le rythme de massage).
  * `expo-speech` (Synthèse vocale pour le guidage vocal).
  * `expo-haptics` (Retours vibratoires tactiles lors de l'entraînement).
  * `expo-location` (Localisation GPS pour l'envoi d'aide).
  * `react-native-reanimated` & `react-native-gesture-handler` (Micro-animations de l'interface).

### B. API de Vision IA (cpr_vision_system)
* **Framework Web** : **FastAPI**, **Uvicorn** (Serveur ASGI).
* **Service Discovery** : Enregistrement Eureka via `py-eureka-client`.
* **Traitement & Modèles d'IA** :
  * **Ultralytics YOLOv8** (`best.pt`, `best.onnx`) : Modèle de deep learning entraîné pour la détection et la classification des gestes RCP.
  * **YOLOv8-Pose** (`yolo26n-pose.onnx`) : Estimation de pose des articulations (bras, poignets, épaules) pour analyser l'angle et la posture du secouriste.
  * **MediaPipe** (v0.10.9) : Suivi des points clés du corps humain (main, poitrine, tête).
  * **OpenCV** (`opencv-python`) : Prétraitement et manipulation des flux vidéo.
  * **SciPy** & **NumPy** : Traitement de signal (filtrage, détection de pics pour évaluer la fréquence et la profondeur des compressions thoraciques).

---

## 📊 6. Observabilité & Monitoring (Stack de Supervision)

Pour garantir la résilience de la plateforme en production, un stack d'observabilité complet est déployé :

* **Prometheus (v2.51.0)** : Collecte de métriques temporelles à partir des terminaux Actuator de Spring Boot, du daemon Python et de la base de données.
* **Grafana (v10.4.0)** : Tableaux de bord visuels pour la surveillance système, l'usage des ressources et les alertes (alerting via SMTP Gmail).
* **Loki (v2.9.4)** : Agrégateur centralisé de journaux de logs.
* **Promtail (v2.9.4)** : Agent d'expédition de logs lisant directement les flux de sortie des conteneurs Docker.
* **Node Exporter (v1.7.0)** : Collecte de métriques matérielles de l'hôte OS.
* **PostgreSQL Exporter (v0.15.0)** : Collecte des indicateurs de performance de la base de données PostgreSQL.
* **OpenWA (Self-hosted WhatsApp API Gateway)** : Passerelle WhatsApp intégrée localement permettant au stack de monitoring ou à l'application d'envoyer des notifications d'alertes directement par message WhatsApp.

---

## 🔐 7. Architecture de Sécurité (JWT Asymétrique RS256)

L'authentification et les autorisations entre tous les microservices sont sécurisées via des signatures asymétriques :
1. **Génération (Signature)** : Le `Core-Service (MS1)` signe les JWT à l'aide d'une clé privée RSA (`private.pem`) avec l'algorithme **RS256**.
2. **Vérification** :
   * L'`Admin-Service (MS3)` charge dynamiquement la clé publique depuis le Core Service pour valider les signatures.
   * Le service Python `Disaster-Detection (MS4)` valide les JWT à l'aide de sa bibliothèque `PyJWT` en vérifiant la clé publique (fournie via variable d'environnement ou fichier de configuration).
   * L'API Gateway distribue les requêtes aux clients et gère le routage sécurisé.
