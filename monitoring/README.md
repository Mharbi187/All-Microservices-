# 📊 NexusAid — Stack de Monitoring Complet

> Prometheus · Grafana · Loki · Promtail · AlertManager · Node Exporter · PostgreSQL Exporter · OpenWA WhatsApp

---

## 🏗️ Architecture

```
Services NexusAid (nexus-aid-net)
├── api-gateway:8060    → /actuator/prometheus
├── core-service:8080   → /actuator/prometheus
├── admin-service:8081  → /actuator/prometheus
├── pdf-service:3001    → /metrics
└── disaster-detection  → /metrics

Stack Monitoring
├── Prometheus:9090       ← scrape toutes les 15s
├── Grafana:3000          ← dashboards & alertes
├── Loki:3100             ← stockage logs
├── Promtail              ← collecte logs Docker
├── AlertManager:9093     ← routage alertes
├── Node Exporter:9100    ← métriques système
├── PG Exporter:9187      ← métriques PostgreSQL
├── OpenWA:8282           ← WhatsApp API Gateway
└── WA Webhook:5001       ← pont AlertManager↔WhatsApp
```

---

## 🚀 Démarrage

### Prérequis
- Docker Desktop installé et en cours d'exécution
- Le stack principal NexusAid déjà démarré

### 1. Configurer l'environnement

```bash
cd "platforme nexus aid/monitoring"
cp .env.monitoring .env

# Éditer .env et configurer :
# - WA_ALERT_NUMBER   (votre numéro WhatsApp sans +)
# - GRAFANA_ADMIN_PASSWORD
```

### 2. Démarrer le stack principal (si pas encore fait)

```bash
cd "platforme nexus aid"
docker compose up -d
```

### 3. Démarrer le stack monitoring

```bash
cd "platforme nexus aid/monitoring"
docker compose -f docker-compose-monitoring.yml --env-file .env.monitoring up -d
```

### 4. Vérifier que tout fonctionne

```bash
# Services UP ?
docker compose -f docker-compose-monitoring.yml ps

# Prometheus scrape ok ?
curl http://localhost:9090/targets

# Métriques core-service ok ?
curl http://localhost:9082/actuator/prometheus | head -20

# Grafana accessible ?
# Ouvrir http://localhost:3000
# Login: admin / NexusAid@2026!
```

---

## 📱 Configuration WhatsApp (OpenWA)

### 1. Scanner le QR Code

Après démarrage, OpenWA génère un QR code :

```bash
docker logs nexus-openwa
```

Scannez le QR code avec WhatsApp depuis votre téléphone.

### 2. Tester l'envoi

```bash
curl -X POST http://localhost:5001/send-test
```

### 3. Configurer le numéro de destination

Dans `monitoring/.env.monitoring` :
```env
WA_ALERT_NUMBER=212600000000   # votre numéro sans +
```

---

## 📧 Configuration Email

L'email utilise le compte Gmail `c6287943@gmail.com` déjà configuré dans le projet.

Pour changer le destinataire des alertes :
```env
ALERT_EMAIL_TO=votre@email.com
```

---

## 📊 Dashboards Grafana

| Dashboard | URL | Description |
|-----------|-----|-------------|
| 🛡️ Sécurité & Auth | /d/nexusaid-security-auth | Connexions, bruteforce, IPs suspectes |
| 🔀 API Gateway | /d/nexusaid-api-gateway | RPS, latence, erreurs HTTP |
| ⚙️ Microservices | /d/nexusaid-microservices | CPU, RAM, disponibilité |
| 🗄️ Base de Données | /d/nexusaid-database | PostgreSQL + système |
| 👤 Audit Utilisateur | /d/nexusaid-audit-user | Actions utilisateurs |
| 🚑 RCP & Formation | /d/nexusaid-rcp-training | Évaluations, scores |
| 🇩🇿 Dashboard National | /d/nexusaid-national | Vue d'ensemble nationale |

---

## 🔔 Alertes Configurées

### Sécurité (Email + WhatsApp)
| Alerte | Seuil | Sévérité |
|--------|-------|----------|
| BruteForceDetected | > 5 échecs / minute | 🔴 CRITIQUE |
| HighLoginFailureRate | > 0.5 req/sec en 5min | ⚠️ WARNING |
| AccountLocked | tout verrouillage | ⚠️ WARNING |
| CriticalRiskScore | score > 80 | 🔴 CRITIQUE |

### Infrastructure (Email + WhatsApp)
| Alerte | Seuil | Sévérité |
|--------|-------|----------|
| ServiceDown | 0 pendant 1min | 🔴 CRITIQUE |
| HighCpuUsage | > 80% pendant 5min | ⚠️ WARNING |
| HighMemoryUsage | > 85% pendant 5min | ⚠️ WARNING |
| DiskSpaceLow | > 90% | 🔴 CRITIQUE |
| PostgreSQLDown | inaccessible 30s | 🔴 CRITIQUE |

### Application (Email + WhatsApp critiques)
| Alerte | Seuil | Sévérité |
|--------|-------|----------|
| HighError500Rate | > 5% des requêtes | 🔴 CRITIQUE |
| SlowResponseTime | P95 > 2s | ⚠️ WARNING |
| CircuitBreakerOpen | état OPEN | 🔴 CRITIQUE |

---

## 📐 Métriques Custom NexusAid

Les métriques suivantes sont exposées par `core-service` :

| Métrique Prometheus | Description |
|--------------------|-------------|
| `nexusaid_login_success_total` | Connexions réussies |
| `nexusaid_login_failure_total` | Échecs de connexion |
| `nexusaid_logout_total` | Déconnexions |
| `nexusaid_accounts_locked_total` | Comptes verrouillés |
| `nexusaid_brute_force_detected_total` | Attaques bruteforce |
| `nexusaid_suspicious_ip_total` | IPs suspectes |
| `nexusaid_risk_score_max` | Score de risque max actuel |
| `nexusaid_pdf_generated_total` | PDFs générés |
| `nexusaid_photo_uploaded_total` | Photos uploadées |
| `nexusaid_rcp_evaluations_total` | Évaluations RCP |
| `nexusaid_sessions_active` | Sessions actives |

---

## 🛠️ Commandes Utiles

```bash
# Voir les logs d'une alerte
docker logs nexus-alertmanager

# Recharger la config Prometheus
curl -X POST http://localhost:9090/-/reload

# Recharger la config AlertManager
curl -X POST http://localhost:9093/-/reload

# Tester le webhook WhatsApp
curl -X POST http://localhost:5001/send-test

# Tester l'email
curl -X POST http://localhost:5001/send-email-test

# Arrêter le monitoring
docker compose -f docker-compose-monitoring.yml down

# Arrêter et supprimer les volumes
docker compose -f docker-compose-monitoring.yml down -v
```

---

## 🔧 Rebuild après modification des services Spring Boot

Après l'ajout de `micrometer-registry-prometheus` aux pom.xml :

```bash
# Rebuilder les services modifiés
docker compose build api-gateway core-service admin-service
docker compose up -d api-gateway core-service admin-service

# Vérifier les métriques
curl http://localhost:9082/actuator/prometheus | grep nexusaid
```
