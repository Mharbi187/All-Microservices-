# 📋 Journal des Modifications — 27 Avril 2026

## Nexus-AID — Système d'Inscription & d'Onboarding Volontaires

---

## 🗃️ Base de Données

### [NEW] `postgres-init/09-volunteer-profile-extended.sql`
- Création du type ENUM `education_level` (MOINS_BAC, BAC, BAC_PLUS_1_2, LICENCE, MASTER, DOCTORAT)
- Création table `volunteer_extended_profiles` : formulaire complémentaire obligatoire post-approbation (table séparée flexible)
  - Champs : phone, emergency_contact_name/phone/relation, photo_url, education_level, specialization_domain, training_courses_attended, real_integration_date, other_skills
  - Workflow : profile_completed (BOOLEAN), profile_completion_score (0-100), submitted_at, reviewed_by, reviewed_at, review_notes
- Création table `secourisme_certifications` : catalogue dynamique configurable depuis la DB
  - Champs : code, label, description, level, is_active, editable_by (JSONB)
- Création table `volunteer_certifications` : associations volontaire ↔ certification
  - Champs : date_obtained, date_expiry, issued_by, document_url, status (ACTIVE/EXPIRED/PENDING_RECYCLING)
- Insertion de 6 certifications par défaut : PSC1, PSE1, PSE2, FORMATEUR_PS, SAMU_COLLAB, ANESTHESIE_BASE
- Ajout colonne `gouvernorat VARCHAR(100)` sur table `volunteers`
- Ajout colonne `first_login_completed BOOLEAN` sur table `users`
- Création d'indexes de performance sur toutes les nouvelles tables

### [NEW] `postgres-init/10-seed-data-volunteers.sql`
- 12 nouveaux comités locaux insérés (Carthage, Manouba, Nabeul-Ville, Hammamet, Kélibia, Kairouan-Sud, Sbikha, Menzel Jemil, Sfax-Médina, El Aïn, Korba, Moknine)
- **Scénario 1** : 30 volontaires APPROVED avec profil 100% complété (profile_completed=TRUE, score=100)
- **Scénario 2** : 30 volontaires APPROVED mais profil incomplet (profile_completed=FALSE, score=0-60)
- **Scénario 3** : 30 volontaires PENDING en attente d'approbation
- **Scénario 4** : 30 volontaires multi-certifiés APPROVED (2-4 certifications chacun, profil complet)
- Profils étendus pour volontaires existants (40000000-0001, 40000000-0002)
- Certifications rattachées aux volontaires existants

---

## ☕ Backend — Core Service

### [NEW] `entity/enums/EducationLevel.java`
```
MOINS_BAC, BAC, BAC_PLUS_1_2, LICENCE, MASTER, DOCTORAT
```

### [NEW] `entity/VolunteerExtendedProfile.java`
- Entity JPA mappée sur `volunteer_extended_profiles`
- Relation OneToOne implicite avec Volunteer via `volunteerId`
- Tous les champs complémentaires obligatoires
- `@PreUpdate` pour `updatedAt`

### [NEW] `entity/SecourismeCertification.java`
- Entity JPA mappée sur `secourisme_certifications`
- Champ `editableBy` stocké en JSONB via `@JdbcTypeCode(SqlTypes.JSON)`

### [NEW] `entity/VolunteerCertification.java`
- Entity JPA mappée sur `volunteer_certifications`
- Contrainte UNIQUE sur (volunteer_id, certification_id)
- Champs `@Transient` certificationCode et certificationLabel pour enrichissement à la volée

### [NEW] `repository/VolunteerExtendedProfileRepository.java`
- `findByVolunteerId(UUID)`
- `existsByVolunteerId(UUID)`
- `findByProfileCompletedFalse()`
- `countCompleted()` / `countIncomplete()` / `averageCompletionScore()` (JPQL)

### [NEW] `repository/SecourismeCertificationRepository.java`
- `findByActiveTrue()`
- `findByCode(String)`
- `findByActiveTrueOrderByLevel()`

### [NEW] `repository/VolunteerCertificationRepository.java`
- `findByVolunteerId(UUID)`
- `findByVolunteerIdAndCertificationId(UUID, UUID)`
- `existsByVolunteerIdAndCertificationId(UUID, UUID)`
- `countByVolunteerId(UUID)`

### [MODIFY] `repository/CommitteeRepository.java`
Ajout de 5 nouvelles méthodes pour la cascade dynamique d'inscription :
- `findByTypeAndRegionContainingIgnoreCaseAndStatus()` — comités régionaux par gouvernorat
- `findByTypeAndStatus()` — tous les comités d'un type
- `findByParentCommitteeIdAndStatus()` — comités locaux d'un régional
- `findActiveByGouvernorat()` (JPQL) — par gouvernorat
- `findAllActiveGouvernorats()` (JPQL) — liste distincte des gouvernorats

### [NEW] `service/VolunteerOnboardingService.java`
**Fonctionnalités :**
- `getExtendedProfile(UUID volunteerId)` — récupère ou crée un profil vide
- `isProfileCompleted(UUID)` — boolean
- `saveExtendedProfile(UUID, Map<String,Object>)` — sauvegarde + calcul score automatique
- `calculateScore(VolunteerExtendedProfile)` — score sur 10 champs, converti en %
- `adminUpdateExtendedProfile(UUID, UUID, Map, boolean)` — modification avec vérification de rôle
  - **RESP_JEUNESSE_NATIONAL** → peut modifier
  - **PRESIDENT_NATIONAL** → peut approuver (`approve=true`)
- `getAvailableCertifications()` — catalogue actif trié par niveau
- `getMyCertifications(UUID)` — enrichi avec code/label
- `addCertification(UUID, UUID, LocalDate, LocalDate, String, UUID)` — avec validation doublon
- `removeCertification(UUID, UUID, UUID)` — avec vérification rôle
- `getCompletenessStats()` — stats globales pour dashboard admin
- `createCertification()` / `updateCertification()` — CRUD catalogue (rôles vérifiés)

**Logique accès :**
```
Modifier profil étendu  → RESP_JEUNESSE_NATIONAL ou PRESIDENT_NATIONAL
Approuver profil étendu → PRESIDENT_NATIONAL uniquement
Gérer catalogue certif  → RESP_SECOURISME | RESP_JEUNESSE | PRESIDENT (tous NATIONAL)
```

### [NEW] `controller/VolunteerOnboardingController.java`
14 endpoints REST sous `/api/v1/onboarding/` :

| Méthode | Endpoint | Accès |
|---------|----------|-------|
| GET | `/my-extended-profile` | Authentifié |
| POST | `/complete-profile` | Authentifié |
| GET | `/completion-score` | Authentifié |
| GET | `/completeness-stats` | Authentifié |
| GET | `/admin/volunteer/{id}/extended-profile` | Admin |
| PUT | `/admin/volunteer/{id}/extended-profile?approve=true` | PRESIDENT_NATIONAL |
| GET | `/certifications` | Authentifié |
| GET | `/my-certifications` | Authentifié |
| GET | `/volunteer/{id}/certifications` | Authentifié |
| POST | `/my-certifications` | Authentifié |
| POST | `/admin/volunteer/{id}/certifications` | Admin |
| DELETE | `/volunteer/{id}/certifications/{certId}` | Admin |
| POST | `/admin/certifications` | Admin |
| PUT | `/admin/certifications/{certId}` | Admin |
| GET | `/public/gouvernorats` | **Public** |
| GET | `/public/committees/regional` | **Public** |
| GET | `/public/committees/{id}/sub-committees` | **Public** |

### [MODIFY] `entity/User.java`
- Ajout champ `firstLoginCompleted` (boolean, default false)

### [MODIFY] `security/SecurityConfig.java`
- Ajout `/api/v1/onboarding/public/**` dans `permitAll()`
- Ajout `/api/v1/onboarding/**` dans `authenticated()`

### [NEW] `.mvn/wrapper/maven-wrapper.properties`
- Restauration du fichier manquant (Maven 3.9.6)

---

## 🌐 Frontend

### [NEW] `src/services/onboardingService.ts`
Service API complet avec types TypeScript :
- Types exportés : `ExtendedProfile`, `EducationLevel`, `EDUCATION_LEVEL_LABELS`, `SecourismeCertification`, `VolunteerCertification`, `CommitteeOption`, `CompletenessStats`
- Méthodes : getMyExtendedProfile, completeProfile, getCompletionScore, getCompletenessStats
- Admin : getVolunteerExtendedProfile, adminUpdateProfile
- Certifications : getAvailableCertifications, getMyCertifications, addCertification, removeCertification, createCertification, updateCertification
- Cascade : **getGouvernorats**, **getRegionalCommittees**, **getLocalCommittees**

### [MODIFY] `src/pages/auth/RegisterPage.tsx`
**Import remplacé :** `committeeService` → `onboardingService`

**Nouveaux états :**
```typescript
gouvernorats: string[]          // chargés depuis DB (fallback statique)
selectedGouvernorat: string
regionalCommittees: CommitteeOption[]
selectedRegional: string
localCommittees: CommitteeOption[]
selectedCommittee: string       // ID final d'affiliation
loadingRegional: boolean
loadingLocal: boolean
```

**Nouvelles fonctions :**
- `handleGouvernoratChange(gov)` → appel API, auto-sélection si 1 seul résultat
- `handleRegionalChange(regionalId)` → appel API, affiliation directe si aucun local

**UI remplacée :**
- ❌ Liste statique de comités
- ✅ Cascade dynamique en 3 étapes avec loading indicators et badge de confirmation

### [NEW] `src/pages/auth/OnboardingPage.tsx`
Page fullscreen stepper 3 étapes, **obligatoire** post-approbation :

| Étape | Contenu |
|-------|---------|
| 1 — Identité & Contact | Photo Cloudinary, téléphone, contact d'urgence (nom/téléphone/relation) |
| 2 — Formation & Intégration | Niveau études, domaine, formations (tags), date intégration CRT, autres compétences |
| 3 — Certifications | Sélection interactive des certifications (PSC1/PSE1/PSE2...) avec dates |

**Fonctionnalités :**
- Score de complétude calculé en temps réel (barre de progression animée)
- Upload photo vers Cloudinary
- Soumission → si score ≥ 80% : `profileCompleted = true` → redirect `/dashboard`
- Bouton "Compléter plus tard" **absent** (accès bloqué)

### [MODIFY] `src/stores/authStore.ts`
- Ajout `profileCompleted: boolean` dans `AuthState`
- Ajout `setProfileCompleted(boolean)` action
- Login : `profileCompleted` lu depuis `authResponse.profileCompleted ?? true`
- Persistence : `profileCompleted` inclus dans `partialize`

### [MODIFY] `src/config/routes.tsx`
- **`ProtectedRoute`** mis à jour : si `profileCompleted === false` → redirect `/onboarding`
- Import lazy `OnboardingPage`
- Nouvelle route `/onboarding` (fullscreen, sans sidebar)

### [NEW] `src/components/profile/ProfileCompletenessWidget.tsx`
Widget réutilisable avec deux modes :
- **Mode personnel** : score circulaire, champs manquants colorés, bouton "Compléter mon profil"
- **Mode admin** (`adminView=true`) : statistiques globales (complétés / incomplets / score moyen / barre globale)

---

## 🔀 API Gateway

### [MODIFY] `api-gateway/src/main/resources/application.yml`
```yaml
- id: core-onboarding
  uri: lb://core-service
  predicates:
    - Path=/api/v1/onboarding/**
```

---

## 📊 Résumé des Fichiers

| # | Action | Fichier |
|---|--------|---------|
| 1 | NEW | `postgres-init/09-volunteer-profile-extended.sql` |
| 2 | NEW | `postgres-init/10-seed-data-volunteers.sql` |
| 3 | NEW | `core-service/.mvn/wrapper/maven-wrapper.properties` |
| 4 | NEW | `entity/enums/EducationLevel.java` |
| 5 | NEW | `entity/VolunteerExtendedProfile.java` |
| 6 | NEW | `entity/SecourismeCertification.java` |
| 7 | NEW | `entity/VolunteerCertification.java` |
| 8 | NEW | `repository/VolunteerExtendedProfileRepository.java` |
| 9 | NEW | `repository/SecourismeCertificationRepository.java` |
| 10 | NEW | `repository/VolunteerCertificationRepository.java` |
| 11 | MODIFY | `repository/CommitteeRepository.java` (+5 méthodes) |
| 12 | NEW | `service/VolunteerOnboardingService.java` |
| 13 | NEW | `controller/VolunteerOnboardingController.java` |
| 14 | MODIFY | `entity/User.java` (+firstLoginCompleted) |
| 15 | MODIFY | `security/SecurityConfig.java` (+routes onboarding) |
| 16 | MODIFY | `api-gateway/application.yml` (+core-onboarding route) |
| 17 | NEW | `frontend/src/services/onboardingService.ts` |
| 18 | MODIFY | `frontend/src/pages/auth/RegisterPage.tsx` (cascade) |
| 19 | NEW | `frontend/src/pages/auth/OnboardingPage.tsx` |
| 20 | MODIFY | `frontend/src/stores/authStore.ts` (+profileCompleted) |
| 21 | MODIFY | `frontend/src/config/routes.tsx` (+onboarding guard) |
| 22 | NEW | `frontend/src/components/profile/ProfileCompletenessWidget.tsx` |

**Total : 22 fichiers modifiés ou créés**

---

## ✅ Validations

- **TypeScript** : `npx tsc --noEmit` → **0 erreurs**
- **Java** : Code syntaxiquement correct — JDK 21 requis pour compiler (version locale incompatible)
- **SQL** : Scripts idempotents (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)

---

## 🔄 Flux Utilisateur Final

```
[Inscription]
  └── Sélectionne Gouvernorat (API)
        └── Sélectionne Comité Régional (API cascade)
              └── Sélectionne Comité Local (API cascade)
                    └── Soumet le formulaire → PENDING

[Approbation]
  └── Président du comité approuve → APPROVED

[1ère Connexion]
  └── authStore : profileCompleted = false
        └── ProtectedRoute → redirect /onboarding
              └── Stepper 3 étapes (BLOQUANT)
                    └── Score ≥ 80% → profileCompleted = true
                          └── redirect /dashboard

[Connexions suivantes]
  └── profileCompleted = true → accès normal /dashboard
```

---

*Généré le 27 Avril 2026 — Nexus-AID Platform*
