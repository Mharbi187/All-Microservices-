# 🚑 CPR Mobile App - Croissant Rouge Tunisien

**Application Mobile d'Assistance RCP en Temps Réel**  
**تطبيق مساعدة الإنعاش القلبي الرئوي في الوقت الحقيقي**

[![React Native](https://img.shields.io/badge/React_Native-0.73-blue)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-50-black)](https://expo.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📱 Aperçu

Application mobile professionnelle pour l'assistance CPR (Réanimation Cardio-Pulmonaire) développée pour le **Croissant Rouge Tunisien**. Fonctionne **100% hors ligne** pour les situations d'urgence.

### Fonctionnalités Principales

| Fonctionnalité | Description |
|----------------|-------------|
| 📷 **Détection de pose** | TensorFlow.js MoveNet multi-personnes |
| 👤👥 **Multi-secouristes** | Support 1 ou 2 secouristes |
| 📊 **Métriques temps réel** | BPM, profondeur, qualité relâchement |
| 🔊 **Guide vocal** | Instructions vocales FR/AR |
| 📍 **Géolocalisation** | Numéro d'urgence automatique par pays |
| 🌙 **Mode hors ligne** | 100% offline, aucune connexion requise |

---

## 🏗️ Structure du Projet

```
cpr_mobile_app/
├── package.json              # Dépendances
├── app.json                  # Configuration Expo
├── babel.config.js           # Configuration Babel
├── index.js                  # Point d'entrée
├── locales/
│   ├── fr.json               # Traductions français
│   └── ar.json               # Traductions arabe
└── src/
    ├── App.js                # Application principale
    ├── screens/
    │   ├── HomeScreen.js     # Écran d'accueil
    │   ├── CPRScreen.js      # Assistance CPR
    │   ├── ProtocolScreen.js # Guide des protocoles
    │   └── SettingsScreen.js # Paramètres
    ├── components/
    │   ├── MetricsDisplay.js     # Affichage métriques
    │   ├── VictimTypeSelector.js # Sélecteur victime
    │   ├── GuidanceOverlay.js    # Messages guidance
    │   └── CompressionProgress.js # Barre progression
    └── services/
        ├── PoseDetectionService.js   # Détection pose IA
        ├── EmergencyNumberService.js # Numéros urgence
        └── CPRAnalysisService.js     # Analyse CPR
```

---

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Appareil physique iOS/Android (émulateur non recommandé)

### Installation

```bash
# Cloner ou copier le dossier
cd cpr_mobile_app

# Installer les dépendances
npm install

# Lancer l'application
npx expo start
```

### Sur appareil

1. Installer **Expo Go** depuis App Store / Play Store
2. Scanner le QR code affiché dans le terminal
3. L'app se lance sur votre appareil

---

## 📋 Protocoles Supportés

| Type | Ratio | BPM | Profondeur |
|------|-------|-----|------------|
| 👨 Adulte | 30:2 | 100-120 | 5-6 cm |
| 👦 Enfant | 15:2 ou 30:2 | 100-120 | 5 cm |
| 👶 Nourrisson | 15:2 ou 30:2 | 100-120 | 4 cm |
| 🤰 Femme enceinte | 30:2 | 100-120 | 5-6 cm |
| 🌊 Noyade | 5V + 30:2 | 100-120 | Standard |
| 🦴 Traumatisme | 30:2 | 100-120 | Standard |

---

## 📞 Numéros d'Urgence

L'application détecte automatiquement le pays et affiche le numéro approprié :

| Pays | Numéro | Service |
|------|--------|---------|
| 🇹🇳 Tunisie | **190** | SAMU |
| 🇩🇿 Algérie | 115 | Protection Civile |
| 🇲🇦 Maroc | 150 | SAMU |
| 🇫🇷 France | 15 | SAMU |
| 🌍 International | 112 | Urgences |

---

## ⚙️ Configuration

### Permissions requises

**Android:**
- `CAMERA` - Détection de pose
- `ACCESS_FINE_LOCATION` - Géolocalisation urgence
- `VIBRATE` - Feedback haptique
- `CALL_PHONE` - Appel d'urgence

**iOS:**
- Camera Usage
- Location When In Use

---

## 🛠️ Technologies

- **React Native** 0.73 + Expo 50
- **TensorFlow.js** + MoveNet (détection pose)
- **Expo Camera** (capture vidéo)
- **Expo Speech** (guide vocal)
- **Expo Haptics** (retour tactile)
- **React Navigation** 6 (navigation)

---

## ⚠️ Avertissement

> **IMPORTANT**: Cette application est un **OUTIL D'ASSISTANCE À LA FORMATION** uniquement.
> 
> - ❌ Ne remplace PAS une formation certifiée
> - ❌ Ne remplace PAS l'appel aux secours (190/112)
> - ❌ N'est PAS un dispositif médical agréé

---

## 📄 Licence

MIT License - Croissant Rouge Tunisien

---

## 🙏 Crédits

- **Croissant Rouge Tunisien** - الهلال الأحمر التونسي
- **FICR** - Fédération Internationale Croix-Rouge/Croissant-Rouge
- **AHA/ERC 2021** - Guidelines médicales

---

**Version:** 1.0.0  
**Date:** Février 2026  
**Contact:** Croissant Rouge Tunisien
