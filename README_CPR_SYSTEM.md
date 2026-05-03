# 🚑 CPR Vision Assistant v3.0 - Mobile Emergency System

**Système d'Assistance RCP en Temps Réel par Vision Artificielle**  
**Application Mobile React Native | 100% Hors Ligne | Multi-Secouristes**

[![Croix-Rouge](https://img.shields.io/badge/Protocoles-Croix--Rouge%20Internationale-red)](https://www.icrc.org)
[![Croissant-Rouge](https://img.shields.io/badge/Protocoles-Croissant--Rouge-green)](https://www.ifrc.org)
[![AHA 2021](https://img.shields.io/badge/Guidelines-AHA%202021-blue)](https://www.heart.org)
[![ERC 2021](https://img.shields.io/badge/Guidelines-ERC%202021-orange)](https://www.erc.edu)

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#-vue-densemble)
2. [Architecture Mobile](#-architecture-mobile-react-native)
3. [Fonctionnalités](#-fonctionnalités)
4. [Protocoles Médicaux](#-protocoles-médicaux-internationaux)
5. [Scénarios Spéciaux](#-scénarios-spéciaux)
6. [Système de Détection](#-système-de-détection-vision-360)
7. [Configuration Technique](#-configuration-technique)
8. [Installation](#-installation)
9. [Utilisation](#-utilisation)
10. [Références](#-références)

---

## 🎯 Vue d'Ensemble

### Mission
Fournir une **assistance d'urgence RCP** accessible à tous, fonctionnant **100% hors ligne** sur mobile, capable de guider un ou plusieurs secouristes avec des **feedbacks en temps réel** basés sur les protocoles internationaux de la **Croix-Rouge** et du **Croissant-Rouge**.

### Caractéristiques Clés

| Fonctionnalité | Description |
|----------------|-------------|
| 📱 **100% Offline** | Aucune connexion Internet requise en situation d'urgence |
| 👥 **Multi-Secouristes** | Support 1 ou 2 secouristes simultanés |
| 📷 **Caméra 360°** | Détection multi-angles via caméras panoramiques |
| 🌍 **Multi-Victimes** | Adulte, Enfant, Nourrisson, Femme enceinte, Traumatisme |
| ⚡ **Temps Réel** | Latence < 100ms pour feedback instantané |
| 🔊 **Guidance Audio** | Instructions vocales multilingues |

---

## 📱 Architecture Mobile (React Native)

### Stack Technique

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION REACT NATIVE                          │
│                     (100% Offline - Urgence)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    COUCHE PRÉSENTATION                       │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │  Écran CPR  │  │  Guide      │  │  Feedback Temps     │  │    │
│  │  │  Principal  │  │  Protocole  │  │  Réel (Visuel+Audio)│  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▲                                       │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    COUCHE LOGIQUE MÉTIER                    │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │  Moteur     │  │  Analyse    │  │  Gestionnaire       │  │    │
│  │  │  Décision   │  │  Signaux    │  │  Protocoles         │  │    │
│  │  │  CPR        │  │  (BPM/Depth)│  │  (Croix-Rouge)      │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▲                                       │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    COUCHE VISION IA                          │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │           Google ML Kit Pose Detection                │   │    │
│  │  │    (Multi-Personnes: jusqu'à 6 détections)           │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │  Détection  │  │  Tracking   │  │  Estimation         │  │    │
│  │  │  Pose       │  │  Multi-     │  │  Profondeur         │  │    │
│  │  │  33 Points  │  │  Personnes  │  │  Compression        │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              ▲                                       │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    COUCHE CAMÉRA                             │    │
│  │  ┌──────────────────────────────────────────────────────┐   │    │
│  │  │         react-native-vision-camera                    │   │    │
│  │  │    Support: Caméra Standard | 360° | Multi-Caméras   │   │    │
│  │  └──────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Dépendances Mobiles

```json
{
  "dependencies": {
    "react-native": "^0.73.x",
    "react-native-vision-camera": "^3.9.x",
    "@react-native-ml-kit/pose-detection": "^1.2.x",
    "@tensorflow/tfjs-react-native": "^0.8.x",
    "react-native-tts": "^4.1.x",
    "react-native-sound": "^0.11.x"
  }
}
```

---

## ✅ Fonctionnalités

### 🔍 Détection et Analyse

| Fonctionnalité | 1 Secouriste | 2 Secouristes |
|----------------|--------------|---------------|
| Détection des mains superposées | ✅ | ✅ |
| Position sur le thorax | ✅ | ✅ |
| Calcul BPM (100-120/min) | ✅ | ✅ |
| Profondeur de compression | ✅ | ✅ |
| Relâchement thoracique complet | ✅ | ✅ |
| Monitoring attention (regard) | ✅ | ✅ |
| Coordination alternance | ❌ | ✅ |
| Détection changement de rôle | ❌ | ✅ |
| Synchronisation ventilations | ❌ | ✅ |

### 👥 Mode 2 Secouristes

```
┌─────────────────────────────────────────────────────────────┐
│                    CONFIGURATION 2 SECOURISTES               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│     SECOURISTE 1                    SECOURISTE 2             │
│    (Compressions)                   (Ventilations)           │
│         │                                │                    │
│         ▼                                ▼                    │
│   ┌──────────┐                    ┌──────────┐               │
│   │ Position │                    │ Position │               │
│   │ Thorax   │                    │ Tête     │               │
│   │ Victime  │                    │ Victime  │               │
│   └──────────┘                    └──────────┘               │
│         │                                │                    │
│         ▼                                ▼                    │
│   Ratio 15:2 (Ped.)              Bascule tête               │
│   ou 30:2 (Adult)                Soulèvement menton          │
│                                                               │
│   ⏱️ ALTERNANCE TOUTES LES 2 MINUTES ⏱️                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏥 Protocoles Médicaux Internationaux

### Organisation de Référence: Croix-Rouge et Croissant-Rouge International

> **IMPORTANT**: Ce système suit les protocoles officiels de la **Fédération Internationale de la Croix-Rouge et du Croissant-Rouge (FICR)** et les recommandations **AHA/ERC 2021**.

### Tableau des Protocoles par Catégorie de Victime

| Catégorie | Ratio C:V | Rythme (BPM) | Profondeur | Technique |
|-----------|-----------|--------------|------------|-----------|
| **Adulte** | 30:2 | 100-120 | 5-6 cm | 2 mains, talon sur talon |
| **Enfant (1-Puberté)** | 15:2 (2 sec.) / 30:2 (1 sec.) | 100-120 | 5 cm ou 1/3 thorax | 1 ou 2 mains |
| **Nourrisson (<1 an)** | 15:2 (2 sec.) / 30:2 (1 sec.) | 100-120 | 4 cm ou 1/3 thorax | 2 doigts ou 2 pouces encerclants |
| **Femme Enceinte (>20 sem.)** | 30:2 | 100-120 | 5-6 cm | 2 mains + déplacement utérin |
| **Noyade** | 5V puis 30:2 | 100-120 | Standard | 5 insufflations initiales |
| **Traumatisme/Fracture** | 30:2 | 100-120 | Standard | Immobilisation rachis |

### Étapes de Vérification (Protocole Croix-Rouge)

```
┌─────────────────────────────────────────────────────────────┐
│           CHAÎNE DE SURVIE - CROIX-ROUGE/CROISSANT-ROUGE    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1️⃣ SÉCURITÉ                                                 │
│     ├── Sécuriser la zone (danger électrique, incendie...)   │
│     └── Protection du sauveteur et de la victime             │
│                                                               │
│  2️⃣ VÉRIFICATION DE LA CONSCIENCE                           │
│     ├── Stimuler (tapoter épaules)                           │
│     ├── Appeler fort: "Est-ce que vous m'entendez?"          │
│     └── Observer réaction                                     │
│                                                               │
│  3️⃣ APPEL DES SECOURS (Auto-détection par géolocalisation) │
│     ├── 🌍 Détection automatique du pays via IP/GPS          │
│     ├── 📞 Affichage du numéro d'urgence LOCAL               │
│     ├── � Bouton d'appel direct intégré                     │
│     └── � Fallback: 112 (universel) si non détecté          │
│                                                               │
│  4️⃣ LIBÉRATION DES VOIES AÉRIENNES (LVA)                    │
│     ├── Bascule prudente de la tête en arrière               │
│     ├── Élévation du menton                                   │
│     └── Vérification corps étrangers visibles                │
│                                                               │
│  5️⃣ VÉRIFICATION DE LA RESPIRATION (10 secondes max)        │
│     ├── VOIR: mouvements thoraciques                         │
│     ├── ÉCOUTER: bruit de respiration                        │
│     └── SENTIR: souffle sur la joue                          │
│                                                               │
│  6️⃣ DÉBUT RCP SI ABSENCE DE RESPIRATION NORMALE             │
│     ├── 30 compressions thoraciques                          │
│     ├── 2 insufflations (si formé et équipé)                 │
│     └── Continuer jusqu'à arrivée des secours/DAE            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆘 Scénarios Spéciaux

### 1. Adulte Standard

```yaml
Mode: ADULT
Ratio: 30 compressions : 2 ventilations
Rythme: 100-120 BPM
Profondeur: 5-6 cm (environ 2 pouces)
Technique: 
  - Talon de la main dominante au centre du thorax
  - Seconde main par-dessus, doigts entrelacés
  - Bras tendus, épaules au-dessus des mains
Relâchement: 100% entre chaque compression
```

### 2. Enfant (1 an à puberté)

```yaml
Mode: CHILD
Ratio: 
  - 1 secouriste: 30:2
  - 2 secouristes: 15:2
Rythme: 100-120 BPM
Profondeur: ~5 cm ou 1/3 du diamètre antéro-postérieur
Technique:
  - 1 ou 2 mains selon taille de l'enfant
  - Centre du thorax (ligne mamelonnaire)
Particularité: Commencer par 5 insufflations si arrêt d'origine respiratoire
```

### 3. Nourrisson (< 1 an)

```yaml
Mode: INFANT
Ratio:
  - 1 secouriste: 30:2
  - 2 secouristes: 15:2
Rythme: 100-120 BPM
Profondeur: ~4 cm ou 1/3 du diamètre thoracique
Technique:
  - 2 doigts (index + majeur) juste sous ligne mamelonnaire
  - OU technique des 2 pouces encerclants (2 secouristes)
Ventilations: Bouche-à-bouche-nez
Particularité: 5 insufflations initiales TOUJOURS
```

### 4. Femme Enceinte (> 20 semaines)

```yaml
Mode: PREGNANCY
Ratio: 30:2
Rythme: 100-120 BPM
Profondeur: 5-6 cm
Modifications CRITIQUES:
  - ⚠️ DÉPLACEMENT UTÉRIN MANUEL vers la GAUCHE
  - OU inclinaison du bassin 15-30° vers la gauche
  - Objectif: Soulager compression de la veine cave
Position: 
  - Si possible, cale sous hanche droite
  - Sinon, un secouriste maintient l'utérus déplacé
Alerte: "Césarienne péri-mortem envisagée après 4-5 min d'ACR"
```

### 5. Noyade

```yaml
Mode: DROWNING
Protocole modifié:
  1. Sortir rapidement de l'eau (sécurité)
  2. Position horizontale
  3. ⚠️ 5 INSUFFLATIONS INITIALES AVANT compressions
  4. Puis cycle 30:2 standard
Logique: Cause hypoxique → priorité oxygénation
Attention: Ne PAS tenter de vider l'eau des poumons
```

### 6. Traumatisme / Fracture du Dos (Rachis)

```yaml
Mode: TRAUMA_SPINE
Ratio: 30:2
Modifications:
  - ⚠️ NE PAS basculer la tête en arrière
  - Utiliser UNIQUEMENT subluxation mandibulaire (jaw thrust)
  - Maintenir alignement tête-cou-tronc
  - Demander aide pour immobilisation
Technique LVA:
  - Placer les mains de chaque côté de la tête
  - Soulever la mâchoire vers l'avant
  - SANS extension du cou
Priorité: RCP > Immobilisation si ACR confirmé
```

### 7. Électrocution

```yaml
Mode: ELECTROCUTION
Avant tout:
  - ⚠️ COUPER LA SOURCE ÉLECTRIQUE
  - NE PAS toucher la victime si courant actif
Protocole: Standard 30:2 une fois sécurisé
Attention: Risque de fibrillation ventriculaire élevé
           → DAE prioritaire si disponible
```

### 8. Hypothermie Sévère

```yaml
Mode: HYPOTHERMIA
Ratio: 30:2 (ralenti si T° < 30°C)
Vérification pouls: 60 secondes (au lieu de 10)
Modifications:
  - Manipuler TRÈS délicatement (risque FV)
  - Limiter à 3 chocs DAE si T° < 30°C
  - Réchauffement passif progressif
Note: "Personne hypotherme n'est morte tant qu'elle n'est pas réchauffée et morte"
```

---

## 📷 Système de Détection Vision 360°

### Support Multi-Caméras

```
┌─────────────────────────────────────────────────────────────┐
│              CONFIGURATION CAMÉRA 360° / MULTI-ANGLES        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                        📷 Caméra 360°                         │
│                    ┌───────────────────┐                     │
│                    │  Vue Panoramique  │                     │
│                    │   (Fisheye/360)   │                     │
│                    └─────────┬─────────┘                     │
│                              │                               │
│                              ▼                               │
│         ┌────────────────────────────────────────┐          │
│         │    Dé-warping / Projection Équirect.   │          │
│         └────────────────────────────────────────┘          │
│                              │                               │
│         ┌────────────────────┼────────────────────┐         │
│         ▼                    ▼                    ▼         │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐     │
│   │  Vue 1   │        │  Vue 2   │        │  Vue 3   │     │
│   │ (Front)  │        │ (Côté)   │        │ (Haut)   │     │
│   └──────────┘        └──────────┘        └──────────┘     │
│         │                    │                    │         │
│         └────────────────────┼────────────────────┘         │
│                              ▼                               │
│              ┌───────────────────────────────┐              │
│              │   Fusion Multi-Vues           │              │
│              │   (Meilleure détection pose)  │              │
│              └───────────────────────────────┘              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Algorithme de Détection Multi-Personnes

```javascript
// Pseudo-code React Native
const detectMultipleRescuers = async (frame) => {
  // Détection de toutes les personnes (max 6)
  const poses = await PoseDetection.detect(frame, {
    maxPoses: 6,
    scoreThreshold: 0.5
  });
  
  // Identifier les secouristes actifs
  const rescuers = poses.filter(pose => {
    return isPerformingCPR(pose.keypoints);
  });
  
  // Classification des rôles
  if (rescuers.length === 1) {
    return analyzeSingleRescuer(rescuers[0]);
  } else if (rescuers.length === 2) {
    return analyzeTeamCPR(rescuers);
  }
  
  return { status: 'WAITING_FOR_RESCUER' };
};

const analyzeTeamCPR = (rescuers) => {
  // Identifier qui fait les compressions
  const compressor = rescuers.find(r => 
    isHandsOnChest(r) && areHandsSuperposed(r)
  );
  
  // Identifier qui gère les voies aériennes
  const ventilator = rescuers.find(r => 
    isNearHead(r) && !areHandsSuperposed(r)
  );
  
  return {
    compressor: monitorCompressions(compressor),
    ventilator: monitorVentilations(ventilator),
    coordination: checkRotationTimer() // 2 min
  };
};
```

---

## ⚙️ Configuration Technique

### Paramètres de Détection

```javascript
const VISION_CONFIG = {
  // Confiance de détection
  POSE_CONFIDENCE: 0.6,
  FACE_CONFIDENCE: 0.5,
  
  // Traitement multi-personnes
  MAX_PERSONS: 6,
  RESCUER_IDENTIFICATION: {
    HANDS_SUPERPOSITION_THRESHOLD_PX: 50,
    CHEST_ROI_EXPANSION: 1.3
  },
  
  // Analyse compression
  COMPRESSION: {
    MIN_DISPLACEMENT_PX: 20,
    MAX_DISPLACEMENT_PX: 150,
    MIN_DURATION_MS: 250,
    MAX_DURATION_MS: 800,
    RECOIL_THRESHOLD_PERCENT: 85
  },
  
  // Attention monitoring
  ATTENTION: {
    MAX_YAW_ANGLE: 35,
    MAX_PITCH_ANGLE: 25,
    DISTRACTION_TIMEOUT_SEC: 2.5
  }
};
```

### Paramètres Médicaux (Croix-Rouge/AHA/ERC)

```javascript
const MEDICAL_PROTOCOLS = {
  ADULT: {
    compressionRatio: 30,
    ventilationRatio: 2,
    minBPM: 100,
    maxBPM: 120,
    optimalBPM: 110,
    minDepthCm: 5.0,
    maxDepthCm: 6.0,
    technique: 'TWO_HANDS_HEEL_OVER_HEEL'
  },
  
  CHILD: {
    compressionRatio: 15, // 2 rescuers
    ventilationRatio: 2,
    minBPM: 100,
    maxBPM: 120,
    minDepthCm: 5.0,
    maxDepthCm: 5.5,
    technique: 'ONE_OR_TWO_HANDS'
  },
  
  INFANT: {
    compressionRatio: 15,
    ventilationRatio: 2,
    minBPM: 100,
    maxBPM: 120,
    minDepthCm: 4.0,
    maxDepthCm: 4.5,
    technique: 'TWO_FINGERS_OR_ENCIRCLING_THUMBS'
  },
  
  PREGNANCY: {
    baseProtocol: 'ADULT',
    modifications: ['MANUAL_UTERINE_DISPLACEMENT_LEFT'],
    alert: 'TILT_PELVIS_15_30_DEGREES_LEFT'
  },
  
  DROWNING: {
    initialVentilations: 5,
    then: 'STANDARD_30_2'
  },
  
  TRAUMA_SPINE: {
    baseProtocol: 'ADULT',
    modifications: ['JAW_THRUST_ONLY', 'NO_HEAD_TILT'],
    priority: 'CPR_OVER_IMMOBILIZATION'
  }
};
```

### Service de Géolocalisation des Numéros d'Urgence

```javascript
// emergencyNumberService.js - Détection automatique par IP/GPS

const EMERGENCY_NUMBERS_DATABASE = {
  // Europe
  'FR': { country: 'France', numbers: { samu: '15', pompiers: '18', police: '17', urgences: '112' }, primary: '15' },
  'DE': { country: 'Allemagne', numbers: { urgences: '112', police: '110' }, primary: '112' },
  'ES': { country: 'Espagne', numbers: { urgences: '112', samu: '061' }, primary: '112' },
  'IT': { country: 'Italie', numbers: { urgences: '112', samu: '118' }, primary: '118' },
  'BE': { country: 'Belgique', numbers: { urgences: '112', samu: '100' }, primary: '112' },
  'CH': { country: 'Suisse', numbers: { samu: '144', urgences: '112' }, primary: '144' },
  'GB': { country: 'Royaume-Uni', numbers: { urgences: '999', alternatif: '112' }, primary: '999' },
  'PT': { country: 'Portugal', numbers: { urgences: '112' }, primary: '112' },
  'NL': { country: 'Pays-Bas', numbers: { urgences: '112' }, primary: '112' },
  'PL': { country: 'Pologne', numbers: { urgences: '112', samu: '999' }, primary: '112' },
  
  // Amérique du Nord
  'US': { country: 'États-Unis', numbers: { urgences: '911' }, primary: '911' },
  'CA': { country: 'Canada', numbers: { urgences: '911' }, primary: '911' },
  'MX': { country: 'Mexique', numbers: { urgences: '911', croix_rouge: '065' }, primary: '911' },
  
  // Maghreb
  'DZ': { country: 'Algérie', numbers: { protection_civile: '115', samu: '14', gendarmerie: '1055' }, primary: '115' },
  'MA': { country: 'Maroc', numbers: { samu: '150', pompiers: '15', police: '190' }, primary: '150' },
  'TN': { country: 'Tunisie', numbers: { samu: '190', protection_civile: '198' }, primary: '190' },
  'LY': { country: 'Libye', numbers: { urgences: '193' }, primary: '193' },
  'EG': { country: 'Égypte', numbers: { ambulance: '123', urgences: '122' }, primary: '123' },
  
  // Moyen-Orient
  'SA': { country: 'Arabie Saoudite', numbers: { ambulance: '997', urgences: '911' }, primary: '997' },
  'AE': { country: 'Émirats Arabes Unis', numbers: { ambulance: '998', police: '999' }, primary: '998' },
  'QA': { country: 'Qatar', numbers: { ambulance: '999' }, primary: '999' },
  'KW': { country: 'Koweït', numbers: { ambulance: '112' }, primary: '112' },
  'JO': { country: 'Jordanie', numbers: { ambulance: '199' }, primary: '199' },
  'LB': { country: 'Liban', numbers: { croix_rouge: '140', defense_civile: '125' }, primary: '140' },
  
  // Afrique
  'SN': { country: 'Sénégal', numbers: { samu: '1515', pompiers: '18' }, primary: '1515' },
  'CI': { country: "Côte d'Ivoire", numbers: { samu: '185', pompiers: '180' }, primary: '185' },
  'CM': { country: 'Cameroun', numbers: { urgences: '119' }, primary: '119' },
  'CD': { country: 'RD Congo', numbers: { urgences: '112' }, primary: '112' },
  
  // Asie
  'CN': { country: 'Chine', numbers: { ambulance: '120', urgences: '110' }, primary: '120' },
  'JP': { country: 'Japon', numbers: { ambulance: '119' }, primary: '119' },
  'KR': { country: 'Corée du Sud', numbers: { urgences: '119' }, primary: '119' },
  'IN': { country: 'Inde', numbers: { urgences: '112', ambulance: '108' }, primary: '112' },
  
  // Océanie
  'AU': { country: 'Australie', numbers: { urgences: '000', alternatif: '112' }, primary: '000' },
  'NZ': { country: 'Nouvelle-Zélande', numbers: { urgences: '111' }, primary: '111' },
  
  // Default (fallback mondial)
  'DEFAULT': { country: 'International', numbers: { urgences: '112' }, primary: '112' }
};

class EmergencyNumberService {
  constructor() {
    this.cachedCountryCode = null;
    this.lastDetectionTime = null;
    this.CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 heures
  }

  /**
   * Détection du pays par IP (avec cache offline)
   * Ordre de priorité: Cache local → GPS → IP Géolocation → Fallback
   */
  async detectCountry() {
    // 1. Vérifier le cache local (fonctionne offline)
    const cached = await this.getFromCache();
    if (cached) return cached;

    try {
      // 2. Essayer GPS d'abord (plus précis, fonctionne offline)
      const gpsCountry = await this.detectByGPS();
      if (gpsCountry) {
        await this.saveToCache(gpsCountry);
        return gpsCountry;
      }

      // 3. Fallback: Géolocalisation par IP (nécessite connexion)
      const ipCountry = await this.detectByIP();
      if (ipCountry) {
        await this.saveToCache(ipCountry);
        return ipCountry;
      }
    } catch (error) {
      console.warn('Géolocalisation échouée:', error);
    }

    // 4. Fallback ultime: numéro universel 112
    return 'DEFAULT';
  }

  async detectByGPS() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Utiliser reverse geocoding local (embarqué dans l'app)
          const countryCode = await this.reverseGeocode(latitude, longitude);
          resolve(countryCode);
        },
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: false }
      );
    });
  }

  async detectByIP() {
    // Services de géolocalisation IP gratuits (avec fallback)
    const services = [
      'https://ipapi.co/json/',
      'https://ip-api.com/json/',
      'https://ipwho.is/'
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, { timeout: 3000 });
        const data = await response.json();
        return data.country_code || data.countryCode || null;
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Obtenir le numéro d'urgence principal pour le pays détecté
   */
  async getEmergencyNumber() {
    const countryCode = await this.detectCountry();
    const entry = EMERGENCY_NUMBERS_DATABASE[countryCode] || EMERGENCY_NUMBERS_DATABASE['DEFAULT'];
    
    return {
      countryCode,
      country: entry.country,
      primaryNumber: entry.primary,
      allNumbers: entry.numbers,
      displayText: `📞 ${entry.primary} (${entry.country})`
    };
  }

  /**
   * Appel d'urgence direct
   */
  async callEmergency() {
    const { primaryNumber } = await this.getEmergencyNumber();
    
    // React Native: utiliser Linking
    const url = `tel:${primaryNumber}`;
    
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Linking.openURL(url);
    }
  }

  // Cache AsyncStorage pour fonctionnement offline
  async saveToCache(countryCode) {
    await AsyncStorage.setItem('emergency_country', JSON.stringify({
      code: countryCode,
      timestamp: Date.now()
    }));
  }

  async getFromCache() {
    try {
      const cached = await AsyncStorage.getItem('emergency_country');
      if (cached) {
        const { code, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < this.CACHE_DURATION_MS) {
          return code;
        }
      }
    } catch {}
    return null;
  }
}

export const emergencyService = new EmergencyNumberService();
```

### Composant React Native - Bouton d'Appel d'Urgence

```jsx
// EmergencyCallButton.jsx
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, View, Linking, Alert } from 'react-native';
import { emergencyService } from './emergencyNumberService';

const EmergencyCallButton = () => {
  const [emergencyInfo, setEmergencyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmergencyNumber();
  }, []);

  const loadEmergencyNumber = async () => {
    try {
      const info = await emergencyService.getEmergencyNumber();
      setEmergencyInfo(info);
    } catch (error) {
      // Fallback en cas d'erreur
      setEmergencyInfo({
        primaryNumber: '112',
        country: 'International',
        displayText: '📞 112 (Urgences)'
      });
    }
    setLoading(false);
  };

  const handleEmergencyCall = () => {
    Alert.alert(
      '⚠️ APPEL D\'URGENCE',
      `Vous allez appeler le ${emergencyInfo.primaryNumber} (${emergencyInfo.country})`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: `APPELER ${emergencyInfo.primaryNumber}`, 
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${emergencyInfo.primaryNumber}`)
        }
      ]
    );
  };

  if (loading) return null;

  return (
    <TouchableOpacity 
      style={styles.emergencyButton}
      onPress={handleEmergencyCall}
    >
      <Text style={styles.emergencyIcon}>🆘</Text>
      <View>
        <Text style={styles.emergencyText}>APPELER LES SECOURS</Text>
        <Text style={styles.emergencyNumber}>
          {emergencyInfo.displayText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = {
  emergencyButton: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: 12
  },
  emergencyText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  emergencyNumber: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9
  }
};

export default EmergencyCallButton;
```

## 📦 Installation

### Prérequis

- Node.js 18+
- React Native CLI ou Expo
- Xcode (iOS) / Android Studio (Android)
- Appareil physique (émulateur non recommandé pour caméra)

### Installation React Native

```bash
# Créer le projet
npx react-native init CPRVisionAssistant --template react-native-template-typescript

cd CPRVisionAssistant

# Installer les dépendances vision
npm install react-native-vision-camera
npm install @react-native-ml-kit/pose-detection

# Installer TTS pour guidance audio
npm install react-native-tts

# iOS: installer pods
cd ios && pod install && cd ..

# Lancer sur appareil
npx react-native run-android
# ou
npx react-native run-ios
```

### Permissions requises

**Android (`android/app/src/main/AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
```

**iOS (`ios/CPRVisionAssistant/Info.plist`):**
```xml
<key>NSCameraUsageDescription</key>
<string>Nécessaire pour détecter et guider la RCP</string>
<key>NSMicrophoneUsageDescription</key>
<string>Pour les alertes audio d'urgence</string>
```

---

## 🚀 Utilisation

### Interface Utilisateur Mobile

```
┌─────────────────────────────────────────────────────────────┐
│  ⚡ CPR ASSISTANT                    🔋 85%  📶 Offline    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │                   [FLUX CAMÉRA]                     │    │
│  │                                                     │    │
│  │        ┌───────────────────────┐                   │    │
│  │        │   Victime détectée    │                   │    │
│  │        │   ══════════════      │                   │    │
│  │        │   Zone thorax         │                   │    │
│  │        └───────────────────────┘                   │    │
│  │                                                     │    │
│  │     ● Secouriste 1 (Compressions) ✓                │    │
│  │     ○ Secouriste 2 (Ventilations) -                │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────┬────────────┬────────────┬───────────┐       │
│  │  BPM       │  PROFOND.  │  RELÂCH.   │  CYCLE    │       │
│  │  🟢 112    │  🟢 5.2cm  │  🟢 95%    │  18/30    │       │
│  └────────────┴────────────┴────────────┴───────────┘       │
│                                                               │
│  ███████████████████░░░░░░░░░░  18/30 compressions          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ✅ EXCELLENT - Continuez à ce rythme!              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  ADULTE  │  │  ENFANT  │  │ NOURRISS │  │ SPÉCIAL  │    │
│  │    ●     │  │    ○     │  │    ○     │  │    ▼     │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Contrôles et Modes

| Action | Effet |
|--------|-------|
| **Tap ADULTE** | Mode adulte (30:2, 5-6cm) |
| **Tap ENFANT** | Mode enfant (15:2 ou 30:2) |
| **Tap NOURRISSON** | Mode nourrisson (2 doigts) |
| **Tap SPÉCIAL** | Menu: Noyade, Enceinte, Trauma |
| **Swipe haut** | Afficher guide protocole |
| **Volume +** | Augmenter guidance audio |
| **Double tap** | Reset compteur cycle |

---

## ⚠️ Avertissements Importants

### ❌ CE SYSTÈME N'EST PAS UN DISPOSITIF MÉDICAL

> **ATTENTION**: Cette application est un **OUTIL DE FORMATION ET D'ASSISTANCE** uniquement.

| Ce que le système FAIT | Ce que le système NE FAIT PAS |
|------------------------|------------------------------|
| ✅ Guider la technique | ❌ Remplacer une formation certifiée |
| ✅ Compter les compressions | ❌ Garantir la survie |
| ✅ Alerter sur les erreurs | ❌ Diagnostiquer médicalement |
| ✅ Fournir des rappels protocole | ❌ Remplacer les services d'urgence |

### Limitations Techniques

1. **Précision profondeur**: Estimation pixel, non clinique
2. **Éclairage**: Nécessite lumière suffisante
3. **Angle caméra**: Optimal à 45-90° du sol
4. **Batterie**: Consommation élevée (prévoir charge)

### Actions OBLIGATOIRES en situation réelle

```
┌─────────────────────────────────────────────────────────────┐
│               ⚠️ EN CAS D'URGENCE RÉELLE ⚠️                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   1. APPELER LES SECOURS IMMÉDIATEMENT                       │
│      📞 15 (SAMU)  |  📞 112 (Europe)  |  📞 911 (USA)      │
│                                                               │
│   2. Demander un DAE (Défibrillateur)                        │
│                                                               │
│   3. Commencer la RCP sans attendre l'application            │
│                                                               │
│   4. Utiliser l'app COMME SUPPORT, pas comme guide unique   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Références Officielles

### Organisations et Guidelines

| Organisation | Document | Année |
|--------------|----------|-------|
| **Croix-Rouge Internationale (CICR)** | Premiers Secours | 2021 |
| **Croissant-Rouge** | FICR First Aid Guidelines | 2021 |
| **American Heart Association (AHA)** | CPR & ECC Guidelines | 2021 |
| **European Resuscitation Council (ERC)** | Resuscitation Guidelines | 2021 |
| **ILCOR** | CoSTR (Consensus on Science) | 2021 |

### Ressources de Formation

- [Formation Croix-Rouge Française](https://www.croix-rouge.fr/Je-me-forme)
- [Formation Croissant-Rouge](https://www.ifrc.org/first-aid)
- [AHA CPR Training](https://cpr.heart.org)
- [ERC Courses](https://www.erc.edu/courses)

### Publications Scientifiques

- MediaPipe: "On-Device Real-time Body Pose Tracking" (Google, 2020)
- "Part 3: Adult Basic Life Support" - Circulation (AHA, 2021)
- "European Resuscitation Council Guidelines 2021" - Resuscitation (ERC, 2021)

---

## 🆘 Numéros d'Urgence Internationaux

| Pays/Région | Numéro | Service |
|-------------|--------|---------|
| 🇪🇺 Europe | **112** | Urgences générales |
| 🇫🇷 France | **15** | SAMU |
| 🇫🇷 France | **18** | Pompiers |
| 🇺🇸 USA/Canada | **911** | Urgences |
| 🇬🇧 UK | **999** | Urgences |
| 🇩🇿 Algérie | **115** | Protection Civile |
| 🇲🇦 Maroc | **150** | SAMU |
| 🇹🇳 Tunisie | **190** | SAMU |
| 🇸🇦 Arabie Saoudite | **997** | Ambulance |
| 🇦🇪 EAU | **998** | Ambulance |

---

## 📝 Licence et Mentions Légales

**Usage**: Éducatif et formation uniquement  
**Statut réglementaire**: NON approuvé comme dispositif médical  
**Responsabilité**: Aucune garantie médicale fournie

---

## 🙏 Remerciements

- **Comité International de la Croix-Rouge (CICR)**
- **Fédération Internationale du Croissant-Rouge**
- **American Heart Association (AHA)**
- **European Resuscitation Council (ERC)**
- **Google MediaPipe Team**
- **React Native Community**

---

**Version**: 3.0.0  
**Plateformes**: React Native (iOS + Android) | Desktop (Python/OpenCV)  
**Date**: Février 2026  
**Conformité**: AHA/ERC 2021 | Croix-Rouge/Croissant-Rouge International

---

> 💡 **Rappel**: La meilleure RCP est celle que vous commencez. N'attendez pas d'être parfait pour agir. Chaque compression compte!

```
    ❤️ PUSH HARD, PUSH FAST, ALLOW FULL RECOIL ❤️
           100-120 BPM | 5-6 cm | 30:2
```
