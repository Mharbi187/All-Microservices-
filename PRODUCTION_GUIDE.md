# 🚀 GUIDE DE MISE EN PRODUCTION - MODULE 4
## Nexus-AID - Système de Gestion des Catastrophes
### Croissant Rouge Tunisien

---

## 📋 CHECKLIST DE PRODUCTION

### Vue d'ensemble des étapes

| # | Étape | Priorité | Effort | Statut |
|---|-------|----------|--------|--------|
| 1 | Configuration des APIs et clés | 🔴 Critique | Faible | ⬜ À faire |
| 2 | Entraînement du modèle avec données réelles | 🔴 Critique | Moyen | ⬜ À faire |
| 3 | Configuration de la base de données | 🔴 Critique | Moyen | ⬜ À faire |
| 4 | Sécurisation et authentification | 🔴 Critique | Élevé | ⬜ À faire |
| 5 | Tests et validation | 🟠 Important | Moyen | ⬜ À faire |
| 6 | Déploiement et infrastructure | 🟠 Important | Élevé | ⬜ À faire |
| 7 | Monitoring et alertes | 🟡 Recommandé | Moyen | ⬜ À faire |
| 8 | Documentation et formation | 🟡 Recommandé | Faible | ⬜ À faire |

---

## 1️⃣ CONFIGURATION DES APIs ET CLÉS (Critique)

### 1.1 Google Earth Engine (GEE)

**Pourquoi :** Source principale des données satellite

**Étapes :**
1. Créer un projet Google Cloud : https://console.cloud.google.com/
2. Activer l'API Earth Engine
3. Créer un compte de service avec clé JSON
4. S'inscrire à Earth Engine : https://earthengine.google.com/signup/

**Configuration :**
```env
# .env
GEE_SERVICE_ACCOUNT=votre-service-account@projet.iam.gserviceaccount.com
GEE_PRIVATE_KEY_PATH=./credentials/gee-service-key.json
```

**Vérification :**
```bash
python -c "from src.data_acquisition import test_gee_connection; test_gee_connection()"
```

### 1.2 NASA FIRMS (Incendies)

**Pourquoi :** Données de feux actifs en temps réel

**Étapes :**
1. Créer un compte Earthdata : https://urs.earthdata.nasa.gov/
2. Demander une clé API FIRMS : https://firms.modaps.eosdis.nasa.gov/api/area/

**Configuration :**
```env
FIRMS_API_KEY=votre_cle_api_firms
```

### 1.3 OpenWeather API

**Pourquoi :** Données météorologiques en temps réel

**Étapes :**
1. Créer un compte : https://openweathermap.org/api
2. Obtenir une clé API (plan gratuit = 1000 appels/jour)

**Configuration :**
```env
OPENWEATHER_API_KEY=votre_cle_openweather
```

### 1.4 Twilio (SMS)

**Pourquoi :** Envoi d'alertes SMS

**Étapes :**
1. Créer un compte : https://www.twilio.com/
2. Obtenir un numéro de téléphone Twilio
3. Récupérer les identifiants

**Configuration :**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 1.5 SendGrid (Email)

**Pourquoi :** Envoi d'alertes email

**Étapes :**
1. Créer un compte : https://sendgrid.com/
2. Créer une clé API
3. Vérifier un domaine d'envoi

**Configuration :**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
ALERT_EMAIL_FROM=alerts@croissant-rouge.tn
```

---

## 2️⃣ ENTRAÎNEMENT DU MODÈLE (Critique)

### 2.1 Obtenir des données réelles

**Sources prioritaires :**

| Source | URL | Type |
|--------|-----|------|
| EM-DAT | https://public.emdat.be/ | Catastrophes historiques |
| GDACS | https://www.gdacs.org/ | Alertes temps réel |
| USGS | https://earthquake.usgs.gov/ | Séismes |

**Actions :**
1. S'inscrire sur EM-DAT (gratuit pour usage non-commercial)
2. Télécharger les données Tunisie (2010-2025)
3. Ajouter au CSV `data/tunisia_disasters_real.csv`

### 2.2 Enrichir les données avec GEE

**Script à modifier :** `retrain_model.py`

```python
# Remplacer les features simulées par des vraies données GEE
from src.data_acquisition import GEEDataAcquisition

gee = GEEDataAcquisition()

for event in real_events:
    features = gee.get_features_for_event(
        date=event['date'],
        lat=event['latitude'],
        lon=event['longitude']
    )
    # Ajouter features au dataset
```

### 2.3 Validation croisée

**Objectifs de performance :**
- Accuracy ≥ 85%
- Recall ≥ 80% (ne pas manquer de catastrophes)
- Precision ≥ 75% (éviter trop de fausses alertes)
- False Positive Rate ≤ 15%

**Commande :**
```bash
python retrain_model.py
```

---

## 3️⃣ BASE DE DONNÉES (Critique)

### 3.1 Choix recommandé : PostgreSQL

**Pourquoi :** Robuste, géospatial (PostGIS), open-source

**Installation :**
```bash
# Docker (recommandé)
docker run -d \
  --name nexusaid-db \
  -e POSTGRES_DB=nexusaid \
  -e POSTGRES_USER=nexusaid_user \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgis/postgis:15-3.3
```

### 3.2 Schéma de base de données

**À créer :**
```sql
-- Tables principales
CREATE TABLE disasters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    disaster_type VARCHAR(50),
    phase VARCHAR(50),
    severity INTEGER,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    detected_at TIMESTAMP,
    declared_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    team_type VARCHAR(50),
    status VARCHAR(50),
    base_latitude DECIMAL(10, 8),
    base_longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id UUID REFERENCES disasters(id),
    team_id UUID REFERENCES teams(id),
    title VARCHAR(255),
    status VARCHAR(50),
    priority INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE crisis_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crisis_room_id UUID,
    sender_id VARCHAR(255),
    content TEXT,
    message_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 ORM recommandé : SQLAlchemy

**Configuration :**
```env
DATABASE_URL=postgresql://nexusaid_user:secure_password@localhost:5432/nexusaid
```

**Fichier à créer :** `src/database.py`

---

## 4️⃣ SÉCURISATION (Critique)

### 4.1 Authentification JWT

**Modifier :** `src/api_integration.py`

```python
import jwt
from functools import wraps

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        if not token:
            return jsonify({'error': 'Token manquant'}), 401
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user_id = payload['user_id']
            request.user_role = payload['role']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expiré'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token invalide'}), 401
        
        return f(*args, **kwargs)
    return decorated
```

### 4.2 Variables d'environnement sécurisées

```env
# .env.production (NE JAMAIS committer!)
SECRET_KEY=votre_clé_secrète_très_longue_et_aléatoire
JWT_EXPIRATION_HOURS=24
```

### 4.3 CORS et HTTPS

```python
from flask_cors import CORS

# Limiter les origines autorisées
CORS(app, origins=[
    'https://nexusaid.croissant-rouge.tn',
    'https://admin.croissant-rouge.tn'
])
```

### 4.4 Rate Limiting

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=get_remote_address)

@app.route('/api/v1/disasters')
@limiter.limit("100/minute")
def get_disasters():
    ...
```

---

## 5️⃣ TESTS ET VALIDATION (Important)

### 5.1 Tests unitaires

**Créer :** `tests/test_model.py`
```python
import pytest
from src.model import DisasterRiskModel

def test_model_prediction():
    model = DisasterRiskModel()
    model.load()
    
    # Cas de feu actif
    fire_data = pd.DataFrame({
        'MaxFRP': [350],
        'water_extent': [0.05],
        'precipitation': [5],
        # ... autres features
    })
    
    predictions, probabilities = model.predict(fire_data)
    assert probabilities[0] > 0.7, "Le modèle devrait détecter un feu actif"

def test_model_no_false_positive():
    # Journée normale
    normal_data = pd.DataFrame({
        'MaxFRP': [10],
        'water_extent': [0.05],
        'precipitation': [5],
    })
    
    predictions, probabilities = model.predict(normal_data)
    assert probabilities[0] < 0.3, "Le modèle ne devrait pas alerter"
```

**Exécuter :**
```bash
pytest tests/ -v --cov=src
```

### 5.2 Tests d'intégration

**Tester l'API :**
```bash
# Créer une catastrophe
curl -X POST http://localhost:5001/api/v1/disasters \
  -H "Content-Type: application/json" \
  -d '{"disaster_type": "flood", "latitude": 36.45, "longitude": 10.74}'

# Vérifier
curl http://localhost:5001/api/v1/disasters/active
```

### 5.3 Tests de charge

```bash
pip install locust

# Créer locustfile.py
locust -f locustfile.py --host=http://localhost:5001
```

---

## 6️⃣ DÉPLOIEMENT (Important)

### 6.1 Option 1 : Docker (Recommandé)

**Créer :** `Dockerfile`
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001 8501

CMD ["python", "-m", "src.api_integration"]
```

**Créer :** `docker-compose.yml`
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5001:5001"
    environment:
      - DATABASE_URL=postgresql://...
      - GEE_SERVICE_ACCOUNT=...
    depends_on:
      - db
  
  dashboard:
    build: .
    command: streamlit run integrated_dashboard.py --server.port 8501
    ports:
      - "8501:8501"
  
  db:
    image: postgis/postgis:15-3.3
    environment:
      - POSTGRES_DB=nexusaid
      - POSTGRES_USER=nexusaid_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 6.2 Option 2 : Serveur Linux

```bash
# Installation
sudo apt update
sudo apt install python3.10 nginx certbot

# Gunicorn pour l'API
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 src.api_integration:app

# Nginx comme reverse proxy
sudo nano /etc/nginx/sites-available/nexusaid
```

**Config Nginx :**
```nginx
server {
    listen 443 ssl;
    server_name api.croissant-rouge.tn;
    
    ssl_certificate /etc/letsencrypt/live/...;
    ssl_certificate_key /etc/letsencrypt/live/...;
    
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6.3 Option 3 : Cloud (Azure/AWS/GCP)

**Azure App Service (Recommandé pour Streamlit) :**
```bash
az webapp up --name nexusaid-m4 --resource-group CRT --runtime PYTHON:3.10
```

---

## 7️⃣ MONITORING (Recommandé)

### 7.1 Logs centralisés

```python
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'logs/app.log', 
    maxBytes=10*1024*1024,  # 10 MB
    backupCount=5
)
logging.getLogger().addHandler(handler)
```

### 7.2 Healthcheck

```python
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'gee_connected': gee_status,
        'timestamp': datetime.now().isoformat()
    })
```

### 7.3 Alertes système

```python
# Envoyer une alerte si le modèle échoue
def send_system_alert(message):
    requests.post(
        'https://hooks.slack.com/services/xxx',
        json={'text': f"🚨 NEXUS-AID Alert: {message}"}
    )
```

---

## 8️⃣ DOCUMENTATION (Recommandé)

### 8.1 Documentation API (Swagger)

```bash
pip install flask-swagger-ui flasgger
```

```python
from flasgger import Swagger

app = Flask(__name__)
Swagger(app)

@app.route('/api/v1/disasters')
def get_disasters():
    """
    Récupérer la liste des catastrophes
    ---
    responses:
      200:
        description: Liste des catastrophes
    """
```

### 8.2 Guide utilisateur

Créer un PDF/Wiki avec :
- Comment créer une alerte
- Comment déployer une équipe
- Comment utiliser la salle de crise
- Procédures d'urgence

---

## ⏱️ PLANNING ESTIMÉ

| Semaine | Tâches |
|---------|--------|
| **1** | Configuration APIs + Clés + Base de données |
| **2** | Entraînement modèle avec données réelles |
| **3** | Sécurisation + Authentification |
| **4** | Tests + Déploiement staging |
| **5** | Tests utilisateurs + Corrections |
| **6** | Déploiement production + Monitoring |

---

## ✅ CHECKLIST FINALE AVANT LANCEMENT

- [ ] Toutes les clés API sont configurées et testées
- [ ] Le modèle est entraîné avec des données réelles (accuracy ≥ 85%)
- [ ] La base de données PostgreSQL est opérationnelle
- [ ] L'authentification JWT est implémentée
- [ ] Les tests unitaires passent (coverage ≥ 80%)
- [ ] Le système est déployé avec HTTPS
- [ ] Les logs et le monitoring sont en place
- [ ] La documentation est à jour
- [ ] Formation des utilisateurs effectuée
- [ ] Plan de reprise d'activité défini

---

## 📞 SUPPORT

Pour toute question :
- Documentation : Ce guide + README.md
- Code source : Dépôt Git
- Contact technique : support@nexusaid.tn

---

**Bonne préparation pour la production ! 🚀**
