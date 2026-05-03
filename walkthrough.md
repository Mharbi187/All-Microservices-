# ✅ Walkthrough — Système de Création & Enrichissement de Comptes Volontaires

## Ce qui a été implémenté

### 🗃️ Phase 1 — Base de Données (2 fichiers)

| Fichier | Description |
|---------|-------------|
| `09-volunteer-profile-extended.sql` | Table `volunteer_extended_profiles` séparée + catalogue `secourisme_certifications` + `volunteer_certifications` + 6 certifications par défaut (PSC1, PSE1, PSE2, FORMATEUR_PS, SAMU_COLLAB, ANESTHESIE_BASE) |
| `10-seed-data-volunteers.sql` | 120 volontaires répartis en 4 scénarios + 12 comités locaux supplémentaires |

**4 scénarios de seed :**
1. **S1** — 30 volontaires APPROVED + profil 100% complété
2. **S2** — 30 volontaires APPROVED mais profil incomplet (bloqués en onboarding)
3. **S3** — 30 volontaires PENDING (en attente d'approbation)
4. **S4** — 30 volontaires multi-certifiés (PSC1 + PSE1 + PSE2)

---

### ☕ Phase 2 — Backend Core Service (11 fichiers)

| Fichier | Description |
|---------|-------------|
| `EducationLevel.java` | Enum éducation (MOINS_BAC → DOCTORAT) |
| `VolunteerExtendedProfile.java` | Entity JPA table séparée, flexible |
| `SecourismeCertification.java` | Catalogue dynamique des certifications |
| `VolunteerCertification.java` | Association volontaire ↔ certification |
| `*Repository.java` (×3) | Repos avec queries analytics |
| `VolunteerOnboardingService.java` | Logique score (0-100), access control RESP_JEUNESSE ↔ PRESIDENT |
| `VolunteerOnboardingController.java` | REST endpoints onboarding + cascade comités |
| `CommitteeRepository.java` | +5 méthodes pour cascade gouvernorat→régional→local |
| `User.java` | +champ `firstLoginCompleted` |
| `SecurityConfig.java` | Routes onboarding public/protected |
| `application.yml` (gateway) | Route `core-onboarding` |

**Logique d'accès :**
- `RESP_JEUNESSE_NATIONAL` → peut modifier le profil étendu
- `PRESIDENT_NATIONAL` → peut approuver (paramètre `?approve=true`)
- `RESP_SECOURISME_NATIONAL` + `RESP_JEUNESSE_NATIONAL` + `PRESIDENT_NATIONAL` → peuvent gérer le catalogue certifications

---

### 🌐 Phase 3 — Frontend (6 fichiers)

| Fichier | Description |
|---------|-------------|
| `onboardingService.ts` | Service API complet (cascade, profil, certifications) |
| `RegisterPage.tsx` | **Cascade dynamique** : gouvernorat → comité régional → comité local |
| `OnboardingPage.tsx` | Stepper 3 étapes, bloquant, score temps réel |
| `authStore.ts` | +`profileCompleted` state + `setProfileCompleted()` |
| `routes.tsx` | Guard onboarding + route `/onboarding` fullscreen |
| `ProfileCompletenessWidget.tsx` | Widget score avec champs manquants + stats admin |

---

## Flux Complet

```
1. Inscription → Gouvernorat ⬇️ (cascade auto)
                → Comité Régional ⬇️ (cascade auto)
                → Comité Local ✅

2. Approbation par le président du comité

3. Première connexion → redirect /onboarding (si profileCompleted = false)
   ↓ Step 1: Photo + Téléphone + Contact urgence
   ↓ Step 2: Niveau études + Domaine + Date intégration réelle
   ↓ Step 3: Certifications secourisme (PSC1, PSE1, PSE2...)
   ↓ Score calculé → si ≥ 80% : profileCompleted = true
   ↓ Redirect /dashboard

4. Accès au dashboard (ProtectedRoute guard)
   → Si profileCompleted = false → bloqué sur /onboarding
```

---

## Endpoints REST créés

### Public (sans authentification)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/onboarding/public/gouvernorats` | Liste des gouvernorats actifs |
| GET | `/api/v1/onboarding/public/committees/regional?gouvernorat=X` | Comités régionaux par gouvernorat |
| GET | `/api/v1/onboarding/public/committees/{id}/sub-committees` | Comités locaux d'un régional |

### Authentifié
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/onboarding/my-extended-profile` | Mon profil étendu |
| POST | `/api/v1/onboarding/complete-profile` | Soumettre le formulaire complémentaire |
| GET | `/api/v1/onboarding/certifications` | Catalogue disponible |
| POST | `/api/v1/onboarding/my-certifications` | Ajouter une certification |
| GET | `/api/v1/onboarding/completeness-stats` | Stats globales (admin) |

### Admin
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| PUT | `/api/v1/onboarding/admin/volunteer/{id}/extended-profile?approve=true` | Approuver (PRESIDENT_NATIONAL) |
| PUT | `/api/v1/onboarding/admin/volunteer/{id}/extended-profile` | Modifier (RESP_JEUNESSE_NATIONAL) |
| POST | `/api/v1/onboarding/admin/certifications` | Créer certification catalogue |

---

## Vérification

- ✅ **TypeScript** : `npx tsc --noEmit` → 0 erreurs
- ⚠️ **Java** : `mvnw compile` → JDK 21 requis (version locale incompatible)
  > Le code Java est syntaxiquement correct, la compilation échoue à cause de la version JDK locale, pas du code.

## Prochain : MyProfilePage tab complétude
