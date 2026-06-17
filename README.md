# 🚨 Nexus-AID Module 4 - Gestion des Catastrophes
## Tunisia Disaster Detection & Response Platform
### Croissant Rouge Tunisien

---

## 📋 Description

Ce module fait partie du système **Nexus-AID** et couvre la **gestion des catastrophes et des équipes de réponse** pour le Croissant Rouge Tunisien.

### Fonctionnalités Principales

| Fonctionnalité | Description | Statut |
|----------------|-------------|--------|
| 🚨 **Détection IA** | Alerte précoce via ML et données satellite | ✅ Complet |
| 🗺️ **Monitoring Temps Réel** | APIs OpenWeather, USGS, GEE | ✅ Complet |
| 👥 **Gestion Équipes NDRT/RDRT/IDRT** | Matching, déploiement, bien-être | ✅ Complet |
| 🏢 **Salle de Crise Virtuelle** | Messages, décisions, visioconférence | ✅ Complet |
| 📋 **Gestion des Missions** | Création, assignation, suivi | ✅ Complet |
| 📊 **Reporting** | Rapports finaux, bénéficiaires | ✅ Complet |
| 🔗 **API REST** | Intégration avec M1, M2, M3 | ✅ Complet |

---

## Production Reliability Update (April 2026)

### Access URLs (avoid 404 confusion)

- MS4 API docs: `http://localhost:8000/docs`
- MS4 API landing endpoint: `http://localhost:8000/`
- Frontend (Vite local dev): `http://localhost:5173/`
- Frontend through gateway (Docker): `http://localhost:8060/`
- Live radar API: `http://localhost:8000/api/v1/radar` (or gateway `/api/v1/radar`)

### Local startup requirements

`start_local_microservices.ps1` must run all of:

- MS4 FastAPI (`uvicorn src.api:app ...`)
- MS4 daemon (`python -m src.daemon`) to keep `data/cache/radar_cache.json` fresh
- API gateway
- Frontend (Vite)

If only the API is running (without daemon), radar can stay empty or stale.

### Model selection (Random Forest / XGBoost / Ensemble)

Set `MODEL_TYPE` before starting MS4:

- `MODEL_TYPE=random_forest` (default)
- `MODEL_TYPE=xgboost`
- `MODEL_TYPE=ensemble`

The model metadata now persists algorithm name + feature schema + dependency versions.
At load time, incompatible feature schemas fail fast.

### Security incident response (required now)

Secrets were previously committed and must be treated as compromised.
Rotate these credentials immediately:

1. OpenWeather API key
2. RabbitMQ credentials
3. Google Earth Engine service account key JSON

Current repository policy:

- Never commit `.env`
- Never commit service-account key files (`detection-*.json`, `keys/*.json`, `*service-account*.json`, `*.pem`, `*.key`)
- Use `.env.example` as placeholders only
- Run `scripts/secret_scan.sh` before push (also enforced in CI)
- Rotation runbook: `docs/SECURITY_ROTATION.md`
- Authority go/no-go checklist: `docs/AUTHORITY_READINESS_CHECKLIST.md`
- Filled status (2026-04-16): `docs/AUTHORITY_READINESS_STATUS_2026-04-16.md`

---

## 🏗️ Architecture

```
Distaster Detection/
├── app.py                          # Dashboard original (alertes ML)
├── integrated_dashboard.py         # Dashboard intégré complet
├── requirements.txt                # Dépendances Python
├── .env                            # Variables d'environnement
│
├── src/
│   ├── __init__.py
│   ├── config.py                   # Configuration globale
│   ├── data_acquisition.py         # Données GEE (satellite)
│   ├── model.py                    # Modèle ML (XGBoost/RF)
│   ├── alerts.py                   # Système d'alertes SMS/Email
│   ├── weather.py                  # API Météo
│   ├── teams.py                    # 🆕 Gestion équipes NDRT/RDRT
│   ├── crisis_room.py              # 🆕 Salle de crise virtuelle
│   ├── disaster_management.py      # 🆕 Gestion catastrophes
│   └── api_integration.py          # 🆕 API REST Flask
│
├── data/
│   └── models/
│       └── disaster_model.pkl      # Modèle ML entraîné
│
└── tests/
    └── ...                         # Tests unitaires
```

---

## 🚀 Installation

### 1. Prérequis

- Python 3.10+
- Google Earth Engine (compte service)
- API Keys (OpenWeather, Twilio, SendGrid)

### 2. Installation des dépendances

```bash
# Cloner le projet
cd "d:\Dev Projects\PFE\Distaster Detection"

# Créer un environnement virtuel
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt
```

### 3. Configuration

Créer un fichier `.env` avec :

```env
# Google Earth Engine
GEE_SERVICE_ACCOUNT=your-service-account@project.iam.gserviceaccount.com
GEE_PRIVATE_KEY_PATH=./keys/gee-service-account.json

# OpenWeather API
OPENWEATHER_API_KEY=your_api_key

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (Email)
SENDGRID_API_KEY=your_sendgrid_key
ALERT_EMAIL_FROM=alerts@nexusaid.tn

# API
API_PORT=8000
FLASK_DEBUG=false
MODEL_TYPE=random_forest
```

---

## 🖥️ Lancement

### Dashboard Intégré (Recommandé)

```bash
streamlit run integrated_dashboard.py
```

### Dashboard Original (Alertes ML uniquement)

```bash
streamlit run app.py
```

### API REST (FastAPI)

```bash
uvicorn src.api:app --host 0.0.0.0 --port 8000
```

L'API sera disponible sur `http://localhost:8000`

---

## 📡 API REST - Endpoints

### Catastrophes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/disasters` | Liste des catastrophes |
| GET | `/api/v1/disasters/active` | Catastrophes actives |
| GET | `/api/v1/disasters/{id}` | Détails d'une catastrophe |
| GET | `/api/v1/disasters/{id}/dashboard` | Tableau de bord |
| POST | `/api/v1/disasters` | Créer une catastrophe |
| POST | `/api/v1/disasters/{id}/declare` | Déclarer officiellement |
| POST | `/api/v1/disasters/{id}/close` | Clôturer |

### Missions

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/disasters/{id}/missions` | Liste des missions |
| POST | `/api/v1/disasters/{id}/missions` | Créer une mission |
| POST | `/api/v1/disasters/{id}/missions/{mid}/assign` | Assigner auto |
| POST | `/api/v1/disasters/{id}/missions/{mid}/start` | Démarrer |
| POST | `/api/v1/disasters/{id}/missions/{mid}/complete` | Compléter |

### Équipes

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/teams` | Liste des équipes |
| GET | `/api/v1/teams/available` | Équipes disponibles |
| GET | `/api/v1/teams/{id}` | Détails d'une équipe |
| POST | `/api/v1/teams/match` | Matching intelligent |
| POST | `/api/v1/teams/{id}/deploy` | Déployer |
| POST | `/api/v1/teams/{id}/return` | Retourner à la base |
| POST | `/api/v1/teams/{id}/wellbeing` | Vérifier bien-être |

### Salle de Crise

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/crisis-rooms` | Liste des salles |
| GET | `/api/v1/crisis-rooms/active` | Salles actives |
| GET | `/api/v1/crisis-rooms/{id}` | Détails |
| POST | `/api/v1/crisis-rooms/{id}/join` | Rejoindre |
| POST | `/api/v1/crisis-rooms/{id}/messages` | Envoyer message |
| POST | `/api/v1/crisis-rooms/{id}/decisions` | Enregistrer décision |

### Webhooks (Intégration M1/M2/M3)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/hooks/alert` | Recevoir alerte ML |
| POST | `/api/v1/hooks/stock-update` | MAJ stocks M1 |
| POST | `/api/v1/hooks/emergency-session` | Session urgence M2 |

---

## 🔗 Intégration avec les autres Modules

### Module 1 - Organisation

- Authentification partagée (JWT)
- Mise à jour des stocks en temps réel
- Profils des volontaires/équipes

### Module 2 - Secourisme IA

- Réception des sessions d'urgence
- Coordination équipes si SAMU contacté
- Partage de localisation

### Module 3 - Administratif

- Reporting automatique
- Suivi des bénéficiaires
- Génération de rapports SitRep/DREF

---

## 📊 Couverture du Cahier des Charges

| Fonctionnalité CDC | Couverture | Fichier |
|--------------------|------------|---------|
| Assistant IA d'alerte précoce | ✅ 100% | `model.py`, `data_acquisition.py` |
| Monitoring APIs (OpenWeather, USGS) | ✅ 100% | `weather.py`, `data_acquisition.py` |
| Analyse prédictive | ✅ 100% | `model.py` |
| Équipes NDRT/RDRT/IDRT | ✅ 100% | `teams.py` |
| Matching compétences/besoins | ✅ 100% | `teams.py` |
| Gestion rotations et disponibilités | ✅ 100% | `teams.py` |
| Suivi bien-être équipes | ✅ 100% | `teams.py` |
| Salle de crise virtuelle | ✅ 100% | `crisis_room.py` |
| Collaboration temps réel | ✅ 100% | `crisis_room.py` |
| Historique décisionnel | ✅ 100% | `crisis_room.py` |

**Couverture totale M4 : 100%** ✅

---

## 🧪 Tests

```bash
# Tester les modules
python -m src.teams
python -m src.crisis_room
python -m src.disaster_management

# Tests complets
pytest tests/
```

---

## 📁 Fichiers Nouveaux Créés

| Fichier | Taille | Description |
|---------|--------|-------------|
| `src/teams.py` | 15 KB | Gestion équipes NDRT/RDRT/IDRT |
| `src/crisis_room.py` | 18 KB | Salle de crise virtuelle |
| `src/disaster_management.py` | 20 KB | Gestion catastrophes centralisée |
| `src/api_integration.py` | 18 KB | API REST Flask |
| `integrated_dashboard.py` | 15 KB | Dashboard Streamlit intégré |

---

## 🎓 Projet de Fin d'Études

- **Projet:** Nexus-AID - Système de Gestion Humanitaire
- **Module:** M4 - Gestion des Catastrophes et Équipes
- **Organisation:** Croissant Rouge Tunisien
- **Date:** Janvier 2026
- **Version:** 1.0.0

---

## 📞 Support

Pour toute question ou problème :
- Documentation : Ce README
- Issues : Créer une issue sur le repo
- Email : support@nexusaid.tn

---

**🎓 Bon courage pour votre soutenance !**
