# NexusAid CRT — Frontend Specification Document
> **Projet** : Système de gestion de la Croix-Rouge Tunisienne (CRT)  
> **Frontend** : React 18 + Vite + TailwindCSS + Material UI + Anime.js + Chart.js  
> **Architecture** : Feature-driven, extensible (microservices-ready)  
> **Auteur** : Généré depuis analyse du backend `core-service`  

---

## 1. Vue d'ensemble du projet

NexusAid est une plateforme web de gestion interne pour la Croix-Rouge Tunisienne. Elle couvre :

| Domaine | Description |
|---|---|
| 🔐 Auth & Profils | Inscription, connexion JWT, gestion de profil |
| 🏛️ Hiérarchie (Comités) | Structure NATIONAL → RÉGIONAL → LOCAL |
| 📦 Inventaire | Gestion des stocks, mouvements, alertes |
| 📋 Rapports mensuels | Workflow DRAFT → VALIDATED → FINALIZED |
| 📣 Plaintes | Soumission et suivi des réclamations |
| 🚑 Secourisme | Équipements, Dispositifs Prévisionnels de Secours |
| 📡 Diffusion | Ressources éducatives, campagnes de sensibilisation |
| 🌱 Jeunesse | Formulaires d'intégration, micro-projets |
| 🏥 Santé | Actions de santé, dons de sang, fichiers bénéficiaires |
| 👨‍👩‍👧 Action Sociale | Familles vulnérables, scoring, actions sociales |
| ✈️ Immigration | Cas migrants, RLF, suivi d'intégration |
| 🛡️ VFF | Cas victimes (confidentiel), parcours de soutien |

---

## 2. Stack Technologique

```json
{
  "framework": "React 18",
  "bundler": "Vite 5",
  "routing": "React Router DOM v6",
  "ui_library": "Material UI (MUI) v6",
  "styling": "TailwindCSS v3",
  "animation": "Anime.js v3",
  "charts": "Chart.js v4 + react-chartjs-2",
  "http": "Axios",
  "server_state": "TanStack React Query v5",
  "global_state": "Zustand v4",
  "forms": "React Hook Form + Zod",
  "i18n": "react-i18next (Français / Arabe)",
  "icons": "MUI Icons + Lucide React",
  "notifications": "React Toastify",
  "date": "Day.js",
  "tables": "TanStack Table v8"
}
```

### Commandes d'installation

```bash
npm create vite@latest nexusaid-frontend -- --template react
cd nexusaid-frontend

# Core
npm install react-router-dom axios @tanstack/react-query zustand

# UI
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# Charts & Animation
npm install chart.js react-chartjs-2 animejs

# Utils
npm install react-i18next i18next dayjs @tanstack/react-table react-toastify
```

---

## 3. Structure des Dossiers (Feature-Driven)

```
frontend/
├── public/
│   └── assets/
│       ├── logo-crt.svg
│       └── favicon.ico
│
├── src/
│   ├── main.jsx                    # Entry point
│   ├── App.jsx                     # Router racine
│   │
│   ├── core/                       # Infrastructure partagée
│   │   ├── api/
│   │   │   ├── axiosInstance.js    # Axios + intercepteur JWT
│   │   │   └── queryClient.js      # TanStack Query config
│   │   ├── auth/
│   │   │   ├── authStore.js        # Zustand : token, user, role
│   │   │   ├── useAuth.js          # Hook auth
│   │   │   └── PrivateRoute.jsx    # Garde de route RBAC
│   │   ├── config/
│   │   │   ├── roles.js            # Constantes RoleTitle + permissions
│   │   │   └── routes.js           # Définition centralisée des routes
│   │   └── i18n/
│   │       ├── i18n.js
│   │       ├── fr/common.json
│   │       └── ar/common.json
│   │
│   ├── shared/                     # Composants réutilisables
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.jsx    # Layout principal (sidebar + topbar)
│   │   │   │   ├── Sidebar.jsx     # Navigation latérale dynamique par rôle
│   │   │   │   ├── Topbar.jsx      # Barre supérieure + notifications
│   │   │   │   └── PageWrapper.jsx # Conteneur de page avec breadcrumb
│   │   │   ├── ui/
│   │   │   │   ├── DataTable.jsx       # Table générique TanStack Table
│   │   │   │   ├── StatCard.jsx        # Carte KPI avec animation Anime.js
│   │   │   │   ├── StatusBadge.jsx     # Badge coloré pour statuts
│   │   │   │   ├── ConfirmDialog.jsx   # Dialog de confirmation MUI
│   │   │   │   ├── LoadingSpinner.jsx  # Loader global
│   │   │   │   ├── EmptyState.jsx      # État vide illustré
│   │   │   │   ├── ErrorBoundary.jsx   # Gestion erreurs React
│   │   │   │   └── SearchInput.jsx     # Champ de recherche avec debounce
│   │   │   ├── forms/
│   │   │   │   ├── FormTextField.jsx   # MUI TextField + RHF
│   │   │   │   ├── FormSelect.jsx      # MUI Select + RHF
│   │   │   │   ├── FormDatePicker.jsx  # MUI DatePicker + Day.js
│   │   │   │   └── FormSubmitButton.jsx
│   │   │   └── charts/
│   │   │       ├── BarChartCard.jsx    # Chart.js Bar wrapper
│   │   │       ├── LineChartCard.jsx   # Chart.js Line wrapper
│   │   │       ├── DoughnutCard.jsx    # Chart.js Doughnut wrapper
│   │   │       └── ChartCard.jsx       # Conteneur carte + titre
│   │   └── hooks/
│   │       ├── useDebounce.js
│   │       ├── usePermission.js        # Vérifie rôle courant
│   │       └── usePaginatedQuery.js    # React Query pagination
│   │
│   ├── features/                   # Un dossier par domaine métier
│   │   │
│   │   ├── auth/                   # ─── AUTHENTIFICATION ───
│   │   │   ├── api/authApi.js
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   └── components/
│   │   │       ├── LoginForm.jsx
│   │   │       └── RegisterForm.jsx
│   │   │
│   │   ├── dashboard/              # ─── TABLEAU DE BORD ───
│   │   │   ├── pages/
│   │   │   │   └── DashboardPage.jsx
│   │   │   └── components/
│   │   │       ├── KpiGrid.jsx
│   │   │       ├── ActivityFeed.jsx
│   │   │       ├── AlertsWidget.jsx
│   │   │       └── QuickActions.jsx
│   │   │
│   │   ├── committees/             # ─── COMITÉS & HIÉRARCHIE ───
│   │   │   ├── api/committeesApi.js
│   │   │   ├── pages/
│   │   │   │   ├── CommitteesListPage.jsx
│   │   │   │   ├── CommitteeDetailPage.jsx
│   │   │   │   └── HierarchyTreePage.jsx
│   │   │   └── components/
│   │   │       ├── CommitteeTree.jsx
│   │   │       ├── CommitteeCard.jsx
│   │   │       ├── CreateCommitteeModal.jsx
│   │   │       └── AssignRoleModal.jsx
│   │   │
│   │   ├── volunteers/             # ─── PROFILS VOLONTAIRES ───
│   │   │   ├── api/volunteersApi.js
│   │   │   ├── pages/
│   │   │   │   ├── VolunteersListPage.jsx
│   │   │   │   ├── PendingVolunteersPage.jsx
│   │   │   │   └── VolunteerDetailPage.jsx
│   │   │   └── components/
│   │   │       ├── VolunteerCard.jsx
│   │   │       ├── VolunteerTable.jsx
│   │   │       ├── PromoteTrainerModal.jsx
│   │   │       └── ApproveRejectButtons.jsx
│   │   │
│   │   ├── inventory/              # ─── INVENTAIRE & STOCKS ───
│   │   │   ├── api/inventoryApi.js
│   │   │   ├── pages/
│   │   │   │   ├── InventoryPage.jsx
│   │   │   │   └── StockAlertsPage.jsx
│   │   │   └── components/
│   │   │       ├── InventoryTable.jsx
│   │   │       ├── StockMovementForm.jsx
│   │   │       ├── CreateItemModal.jsx
│   │   │       ├── AlertsList.jsx
│   │   │       └── StockChart.jsx
│   │   │
│   │   ├── reports/                # ─── RAPPORTS MENSUELS ───
│   │   │   ├── api/reportsApi.js
│   │   │   ├── pages/
│   │   │   │   ├── ReportsListPage.jsx
│   │   │   │   └── ReportDetailPage.jsx
│   │   │   └── components/
│   │   │       ├── ReportCard.jsx
│   │   │       ├── ReportForm.jsx
│   │   │       └── WorkflowStepper.jsx # DRAFT → VALIDATED → FINALIZED
│   │   │
│   │   ├── complaints/             # ─── RÉCLAMATIONS ───
│   │   │   ├── api/complaintsApi.js
│   │   │   ├── pages/
│   │   │   │   ├── ComplaintsPage.jsx
│   │   │   │   └── MyComplaintsPage.jsx
│   │   │   └── components/
│   │   │       ├── ComplaintForm.jsx
│   │   │       └── ComplaintStatusChip.jsx
│   │   │
│   │   ├── secourisme/             # ─── SECOURISME ───
│   │   │   ├── api/secourismeApi.js
│   │   │   ├── pages/
│   │   │   │   ├── SecourismePage.jsx
│   │   │   │   ├── EquipmentPage.jsx
│   │   │   │   └── RescueDevicesPage.jsx
│   │   │   └── components/
│   │   │       ├── EquipmentTable.jsx
│   │   │       ├── AddEquipmentModal.jsx
│   │   │       ├── RescueDeviceCard.jsx
│   │   │       └── AddDeviceModal.jsx
│   │   │
│   │   ├── diffusion/              # ─── DIFFUSION ───
│   │   │   ├── api/diffusionApi.js
│   │   │   ├── pages/
│   │   │   │   ├── DiffusionPage.jsx
│   │   │   │   ├── ResourcesPage.jsx
│   │   │   │   └── CampaignsPage.jsx
│   │   │   └── components/
│   │   │       ├── ResourceCard.jsx
│   │   │       ├── ResourceUploadForm.jsx
│   │   │       ├── CampaignCard.jsx
│   │   │       └── CreateCampaignModal.jsx
│   │   │
│   │   ├── jeunesse/               # ─── JEUNESSE ───
│   │   │   ├── api/jeunesseApi.js
│   │   │   ├── pages/
│   │   │   │   ├── JeunesseIndexPage.jsx
│   │   │   │   ├── IntegrationFormsPage.jsx
│   │   │   │   └── MicroProjectsPage.jsx
│   │   │   └── components/
│   │   │       ├── IntegrationFormCard.jsx
│   │   │       ├── SubmitFormModal.jsx
│   │   │       ├── RecommendationBadge.jsx
│   │   │       ├── MicroProjectCard.jsx
│   │   │       └── CreateProjectModal.jsx
│   │   │
│   │   ├── sante/                  # ─── SANTÉ ───
│   │   │   ├── api/santeApi.js
│   │   │   ├── pages/
│   │   │   │   ├── SantePage.jsx
│   │   │   │   ├── BloodDonationsPage.jsx
│   │   │   │   ├── HealthActionsPage.jsx
│   │   │   │   └── HealthFilesPage.jsx
│   │   │   └── components/
│   │   │       ├── BloodDonationTable.jsx
│   │   │       ├── BloodTypeChart.jsx      # Doughnut Chart.js
│   │   │       ├── AddDonationModal.jsx
│   │   │       ├── HealthActionForm.jsx
│   │   │       └── ActionChiefAssign.jsx
│   │   │
│   │   ├── social/                 # ─── ACTION SOCIALE ───
│   │   │   ├── api/socialApi.js
│   │   │   ├── pages/
│   │   │   │   ├── SocialIndexPage.jsx
│   │   │   │   ├── FamiliesPage.jsx
│   │   │   │   ├── FamilyDetailPage.jsx
│   │   │   │   └── SocialActionsPage.jsx
│   │   │   └── components/
│   │   │       ├── FamilyTable.jsx
│   │   │       ├── FamilyForm.jsx
│   │   │       ├── VulnerabilityScoreCard.jsx # Score visuel animé
│   │   │       ├── NeedsTagList.jsx
│   │   │       └── SocialActionTimeline.jsx
│   │   │
│   │   ├── immigration/            # ─── IMMIGRATION ───
│   │   │   ├── api/immigrationApi.js
│   │   │   ├── pages/
│   │   │   │   ├── ImmigrationPage.jsx
│   │   │   │   ├── MigrantCasesPage.jsx
│   │   │   │   ├── FamilyLinksPage.jsx
│   │   │   │   └── IntegrationTrackingPage.jsx
│   │   │   └── components/
│   │   │       ├── MigrantCaseTable.jsx
│   │   │       ├── RegisterMigrantModal.jsx
│   │   │       ├── FamilyLinkCard.jsx
│   │   │       └── IntegrationProgress.jsx  # Stepper MUI
│   │   │
│   │   └── vff/                    # ─── VFF (accès restreint) ───
│   │       ├── api/vffApi.js
│   │       ├── pages/
│   │       │   ├── VffIndexPage.jsx
│   │       │   ├── VictimCasesPage.jsx
│   │       │   ├── VictimCaseDetailPage.jsx
│   │       │   └── ProtectionCampaignsPage.jsx
│   │       └── components/
│   │           ├── VictimCaseTable.jsx     # Anonymisé
│   │           ├── ReportCaseModal.jsx
│   │           ├── SupportPathStepper.jsx  # REPORTED→ACCOMMODATED→LEGAL→RECOVERED
│   │           ├── RiskLevelBadge.jsx
│   │           └── ProtectionCampaignCard.jsx
│   │
│   └── pages/                      # Pages globales
│       ├── LandingPage.jsx         # Page d'accueil publique
│       ├── NotFoundPage.jsx        # 404
│       ├── UnauthorizedPage.jsx    # 403
│       └── ProfilePage.jsx         # Profil utilisateur courant
│
├── tailwind.config.js
├── vite.config.js
├── .env
├── .env.example
└── package.json
```

---

## 4. Routage (React Router v6)

```jsx
// src/core/config/routes.js — Routes centralisées
export const ROUTES = {
  // Public
  HOME:         '/',
  LOGIN:        '/login',
  REGISTER:     '/register',

  // Protected - Core
  DASHBOARD:    '/dashboard',
  PROFILE:      '/profile',

  // Committees
  COMMITTEES:             '/committees',
  COMMITTEE_DETAIL:       '/committees/:id',
  HIERARCHY:              '/committees/hierarchy',

  // Volunteers
  VOLUNTEERS:             '/volunteers',
  VOLUNTEERS_PENDING:     '/volunteers/pending',
  VOLUNTEER_DETAIL:       '/volunteers/:id',

  // Inventory
  INVENTORY:              '/inventory',
  INVENTORY_COMMITTEE:    '/inventory/committee/:committeeId',
  STOCK_ALERTS:           '/inventory/alerts',

  // Reports
  REPORTS:                '/reports',
  REPORT_DETAIL:          '/reports/:id',

  // Complaints
  COMPLAINTS:             '/complaints',
  MY_COMPLAINTS:          '/complaints/my',

  // Domains
  SECOURISME:             '/secourisme',
  SECOURISME_EQUIPMENT:   '/secourisme/equipment/:committeeId',
  SECOURISME_DEVICES:     '/secourisme/devices/:committeeId',

  DIFFUSION:              '/diffusion',
  DIFFUSION_RESOURCES:    '/diffusion/resources',
  DIFFUSION_CAMPAIGNS:    '/diffusion/campaigns',

  JEUNESSE:               '/jeunesse',
  JEUNESSE_FORMS:         '/jeunesse/forms',
  JEUNESSE_PROJECTS:      '/jeunesse/projects',

  SANTE:                  '/sante',
  SANTE_BLOOD:            '/sante/blood-donations',
  SANTE_ACTIONS:          '/sante/actions/:committeeId',
  SANTE_FILES:            '/sante/health-files',

  SOCIAL:                 '/social',
  SOCIAL_FAMILIES:        '/social/families',
  SOCIAL_FAMILY_DETAIL:   '/social/families/:id',
  SOCIAL_ACTIONS:         '/social/actions',

  IMMIGRATION:            '/immigration',
  IMMIGRATION_CASES:      '/immigration/cases',
  IMMIGRATION_LINKS:      '/immigration/family-links',
  IMMIGRATION_TRACKING:   '/immigration/tracking/:caseId',

  VFF:                    '/vff',
  VFF_CASES:              '/vff/cases',
  VFF_CASE_DETAIL:        '/vff/cases/:id',
  VFF_CAMPAIGNS:          '/vff/campaigns',
};
```

---

## 5. Gestion d'État Global (Zustand)

```js
// src/core/auth/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,       // { id, email, fullName, type }
      roles: [],        // ['PRESIDENT', 'RESP_SANTE', ...]
      committeeId: null,

      setAuth: (token, user, roles, committeeId) =>
        set({ token, user, roles, committeeId }),

      logout: () =>
        set({ token: null, user: null, roles: [], committeeId: null }),

      hasRole: (role) => (state) => state.roles.includes(role),
    }),
    { name: 'nexusaid-auth' }
  )
);
```

---

## 6. Couche API (Axios + React Query)

### Instance Axios avec intercepteur JWT

```js
// src/core/api/axiosInstance.js
import axios from 'axios';
import { useAuthStore } from '../auth/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### Services API par domaine

```
src/features/auth/api/authApi.js
  → POST /auth/login
  → POST /auth/register

src/features/committees/api/committeesApi.js
  → GET  /management/committees
  → POST /management/committees
  → GET  /management/committees/hierarchy/overview
  → POST /management/committees/:id/roles

src/features/volunteers/api/volunteersApi.js
  → GET  /profiles/me
  → GET  /profiles/committees/:id/volunteers
  → GET  /profiles/committees/:id/pending-volunteers
  → PUT  /profiles/volunteers/:id/approve
  → PUT  /profiles/volunteers/:id/reject
  → PUT  /profiles/volunteers/:id/promote-to-trainer

src/features/inventory/api/inventoryApi.js
  → GET  /inventory/committees/:id
  → POST /inventory
  → POST /inventory/:id/movement/in
  → POST /inventory/:id/movement/out
  → GET  /inventory/alerts
  → POST /inventory/alerts/trigger
  → POST /inventory/alerts/:id/resolve

src/features/reports/api/reportsApi.js
  → GET  /reports/committee/:id
  → POST /reports/monthly
  → POST /reports/:id/validate
  → POST /reports/:id/finalize

src/features/complaints/api/complaintsApi.js
  → GET  /profiles/complaints
  → GET  /profiles/complaints/my-complaints
  → POST /profiles/complaints
  → PUT  /profiles/complaints/:id/status

src/features/secourisme/api/secourismeApi.js
  → GET  /secourisme/committees/:id/equipment
  → POST /secourisme/committees/:id/equipment
  → GET  /secourisme/committees/:id/devices
  → POST /secourisme/committees/:id/devices

src/features/diffusion/api/diffusionApi.js
  → GET  /diffusion/resources
  → POST /diffusion/resources
  → GET  /diffusion/campaigns
  → POST /diffusion/campaigns

src/features/jeunesse/api/jeunesseApi.js
  → POST /jeunesse/forms
  → GET  /jeunesse/forms
  → GET  /jeunesse/forms/:id/recommendation
  → POST /jeunesse/forms/:id/recommendation
  → POST /jeunesse/projects
  → GET  /jeunesse/projects

src/features/sante/api/santeApi.js
  → POST /sante/committees/:id/actions
  → GET  /sante/committees/:id/actions
  → POST /sante/blood-donations
  → GET  /sante/blood-donations
  → POST /sante/health-files
  → GET  /sante/health-files/intervention/:id
  → POST /sante/action-chiefs

src/features/social/api/socialApi.js
  → POST /social/families
  → GET  /social/families
  → GET  /social/families/:id/score
  → POST /social/families/:id/score
  → POST /social/actions
  → GET  /social/families/:id/actions

src/features/immigration/api/immigrationApi.js
  → POST /immigration/cases
  → GET  /immigration/cases
  → POST /immigration/family-links
  → GET  /immigration/family-links
  → PUT  /immigration/family-links/:id/resolve
  → GET  /immigration/tracking/:caseId
  → POST /immigration/tracking/:caseId

src/features/vff/api/vffApi.js
  → POST /vff/cases
  → GET  /vff/cases
  → POST /vff/support-paths/:caseId
  → PUT  /vff/support-paths/:caseId
  → GET  /vff/support-paths/:caseId
  → POST /vff/campaigns
  → GET  /vff/campaigns
```

---

## 7. Contrôle d'Accès Basé sur les Rôles (RBAC)

### Rôles définis par le backend

```js
// src/core/config/roles.js
export const ROLES = {
  PRESIDENT:           'PRESIDENT',
  VICE_PRESIDENT:      'VICE_PRESIDENT',
  SECRETAIRE_GENERAL:  'SECRETAIRE_GENERAL',
  RESP_SECOURISME:     'RESP_SECOURISME',
  RESP_DIFFUSION:      'RESP_DIFFUSION',
  RESP_JEUNESSE:       'RESP_JEUNESSE',
  RESP_SANTE:          'RESP_SANTE',
  RESP_CATASTROPHES:   'RESP_CATASTROPHES',
  RESP_ACTION_SOCIALE: 'RESP_ACTION_SOCIALE',
  RESP_IMMIGRATION:    'RESP_IMMIGRATION',
  RESP_VFF:            'RESP_VFF',
  VOLUNTEER:           'VOLUNTEER',
  TRAINER:             'TRAINER',
  DONOR:               'DONOR',
};

export const DOMAIN_PERMISSIONS = {
  secourisme:  [ROLES.PRESIDENT, ROLES.RESP_SECOURISME],
  diffusion:   [ROLES.PRESIDENT, ROLES.RESP_DIFFUSION, ROLES.VOLUNTEER, ROLES.TRAINER],
  jeunesse:    [ROLES.PRESIDENT, ROLES.RESP_JEUNESSE, ROLES.VOLUNTEER],
  sante:       [ROLES.PRESIDENT, ROLES.RESP_SANTE],
  social:      [ROLES.PRESIDENT, ROLES.RESP_ACTION_SOCIALE],
  immigration: [ROLES.PRESIDENT, ROLES.RESP_IMMIGRATION],
  vff:         [ROLES.PRESIDENT, ROLES.RESP_VFF],
  inventory:   [ROLES.PRESIDENT, ROLES.RESP_SANTE, ROLES.RESP_SECOURISME, ROLES.RESP_ACTION_SOCIALE],
  reports: {
    create: [ROLES.RESP_SECOURISME, ROLES.RESP_SANTE, ROLES.RESP_JEUNESSE, ROLES.RESP_ACTION_SOCIALE, ROLES.RESP_DIFFUSION, ROLES.RESP_IMMIGRATION, ROLES.RESP_VFF],
    validate: [ROLES.SECRETAIRE_GENERAL],
    finalize: [ROLES.PRESIDENT],
  },
};
```

### Composant PrivateRoute

```jsx
// src/core/auth/PrivateRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './authStore';

export const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { token, roles } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && !roles.some(r => allowedRoles.includes(r))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
```

### Sidebar dynamique

La barre de navigation affiche uniquement les modules accessibles au rôle courant. Exemple :
- **VOLUNTEER** → Mes plaintes, Diffusion (lecture), Jeunesse (formulaires/projets)
- **RESP_VFF** → VFF uniquement
- **PRESIDENT** → Tous les modules

---

## 8. Description des Pages

### 8.1 Page d'Accueil Publique (`/`)

- **Hero Section** : Logo CRT + animation Anime.js (fade-in texte), slogan, bouton "Se connecter"
- **Présentation** : 6 cartes de domaines avec icônes et animations de survol
- **Statistiques publiques** : Compteurs animés (bénévoles, familles aidées, etc.)
- **Footer** : Liens, contacts, copyright

### 8.2 Authentification

#### Page Login (`/login`)
- Card MUI centrée, fond dégradé rouge/blanc CRT
- Champs : Email + Mot de passe
- Validation Zod en temps réel
- Animation Anime.js sur le logo au chargement
- Redirection vers `/dashboard` après token JWT
- Lien "Pas encore de compte → Inscription"

#### Page Inscription (`/register`)
- Formulaire multi-champs :
  - `fullName`, `email`, `password`, `confirmPassword`
  - `cin` (Carte d'Identité Nationale), `phone`
  - `type` : VOLUNTEER / DONOR (choix via boutons radio MUI)
- Validation Zod complète
- Auto-login après inscription réussie

### 8.3 Dashboard (`/dashboard`)

Adapté au rôle de l'utilisateur connecté.

**Composants :**
- **KpiGrid** : 4-6 cartes `StatCard` animées (Anime.js counter up)
  - Total bénévoles actifs
  - Plaintes en attente
  - Alertes stock actives
  - Rapports en cours
- **AlertsWidget** : Liste des alertes stock non résolues
- **ActivityFeed** : Dernières actions (audit log)
- **QuickActions** : Boutons rapides selon rôle (ex: "Nouveau rapport", "Approuver bénévoles")
- **Charts** :
  - Bar Chart : Mouvements de stock par mois
  - Doughnut : Répartition des bénévoles par type
  - Line Chart : Évolution des dons de sang

### 8.4 Comités & Hiérarchie

#### Liste des Comités (`/committees`)
- Table avec colonnes : Nom, Type (NATIONAL/REGIONAL/LOCAL), Région, Nombre de rôles
- Bouton "Créer un comité" (PRESIDENT seulement)
- Filtre par type

#### Vue Arborescente (`/committees/hierarchy`)
- Visualisation arbre hiérarchique : NATIONAL → REGIONAL → LOCAL
- Composant `CommitteeTree` avec expand/collapse animé (Anime.js)
- Clic sur nœud → navigation vers détail comité

#### Détail Comité (`/committees/:id`)
- Infos comité + liste des rôles assignés
- Bouton "Assigner un rôle" → `AssignRoleModal` (sélection bénévole + titre)

### 8.5 Gestion des Bénévoles

#### Liste (`/volunteers`)
- Table paginée : Nom, Email, Matricule, Date adhésion, Statut compte
- Recherche par nom/email

#### Bénévoles en attente (`/volunteers/pending`)
- Cards de bénévoles `PENDING` avec boutons Approuver/Rejeter
- Badge rouge sur la sidebar si en attente > 0

#### Détail bénévole (`/volunteers/:id`)
- Infos complètes + compétences (JSON visualisé)
- Progression formations
- Bouton "Promouvoir en Formateur"

### 8.6 Inventaire (`/inventory`)

- Table des articles par comité : Nom, Catégorie (MEDICAL/CLOTHING/FOOD/EQUIPMENT), Quantité, Seuil d'alerte
- Boutons "Entrée stock" / "Sortie stock" → formulaire rapide
- Badge rouge si quantité < seuil
- **Graphique** : Évolution du stock (Line Chart sur 6 mois)

#### Alertes Stock (`/inventory/alerts`)
- Liste des alertes actives (triées par sévérité : CRITICAL > HIGH > MEDIUM > LOW)
- Bouton "Résoudre" par alerte
- `StatusBadge` coloré selon sévérité

### 8.7 Rapports Mensuels

#### Liste (`/reports`)
- Filtrable par comité + statut (DRAFT/VALIDATED/FINALIZED)
- `WorkflowStepper` visuel au-dessus

#### Détail rapport (`/reports/:id`)
- Contenu du rapport + historique des approbations
- Bouton contextuel selon rôle :
  - RESP_* → "Soumettre"
  - SECRETAIRE_GENERAL → "Valider"
  - PRESIDENT → "Finaliser"

### 8.8 Domaine Sécourisme (`/secourisme`)

Onglets : **Équipements** | **Dispositifs Prévisionnels (DPS)**

- **Équipements** : Table, filtre par comité, modal ajout
- **DPS** : Cards événement (nom, date, lieu, nbre secouristes requis, statut PLANNED/ACTIVE/COMPLETED)
- Indicateur : nbre secouristes assignés vs requis (Progress bar MUI)

### 8.9 Domaine Diffusion (`/diffusion`)

Onglets : **Ressources Éducatives** | **Campagnes**

- **Ressources** : Grille de cartes (titre, type VIDEO/ARTICLE/PDF, langue, catégorie)
- **Campagnes** : Liste chronologique avec statut

### 8.10 Domaine Jeunesse (`/jeunesse`)

Onglets : **Formulaires d'intégration** | **Micro-projets**

- **Formulaires** : Table + bouton "Nouveau formulaire" (VOLUNTEER)
- **Recommandations** : Badge coloré (ACCEPTED/PENDING/REJECTED)
- **Micro-projets** : Cards (titre, thème, dates de début/fin, responsable)

### 8.11 Domaine Santé (`/sante`)

Onglets : **Dons de sang** | **Actions de santé** | **Fichiers bénéficiaires**

- **Dons de sang** :
  - Table filtrée par groupe sanguin / zone / statut
  - **Doughnut Chart** : Répartition par groupe sanguin (A+, O-, B+, etc.)
  - Modale d'ajout de don
- **Actions de santé** : Liste des campagnes par comité
- **Fichiers bénéficiaires** : Table par intervention, confidentiel

### 8.12 Domaine Action Sociale (`/social`)

- **Familles** : Table + carte (nom, chef de famille, membres, statut ACTIVE/SUPPORTED/ARCHIVED)
- **Détail famille** :
  - Section besoins (`NeedsTagList` : MEDICAL, FOOD, SHELTER, etc.)
  - `VulnerabilityScoreCard` : Score visuel avec jauge animée
  - Timeline des actions sociales réalisées
- **Score de vulnérabilité** : Formulaire de calcul avec indicateurs

### 8.13 Domaine Immigration (`/immigration`)

Onglets : **Cas migrants** | **Liens familiaux (RLF)** | **Suivi d'intégration**

- **Cas migrants** : Table (nom, nationalité, date, situation légale, logement, statut)
- **RLF** : Dossiers de recherche de liens familiaux avec résolution
- **Suivi intégration** : `IntegrationProgress` — Stepper MUI avec étapes

### 8.14 Domaine VFF — Violence Faites aux Femmes (`/vff`)

> ⚠️ Accès restreint : `PRESIDENT` et `RESP_VFF` uniquement

- **Cas victimes** : Table **anonymisée** (référence case + âge + type incident + niveau risque)
- **Détail cas** :
  - Infos de base + `RiskLevelBadge` (LOW/MEDIUM/HIGH/CRITICAL)
  - `SupportPathStepper` : REPORTED → ACCOMMODATED → LEGAL_ACTION → RECOVERED
  - Suivi médical / psychologique / juridique (JSON éditable)
  - Indicateur hébergement + référence dossier tribunal
- **Campagnes de protection** : Liste avec dates et objectifs

---

## 9. Système de Design

### Palette de couleurs (inspirée CRT)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          500: '#DC143C',   // Rouge CRT principal
          600: '#c01234',
          700: '#a00f2a',
          900: '#700a1d',
        },
        secondary: {
          500: '#1a1a2e',   // Bleu nuit (sidebar)
          600: '#16213e',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        danger:  '#ef4444',
        neutral: {
          100: '#f5f5f5',
          200: '#e5e5e5',
          800: '#262626',
        },
      },
    },
  },
};
```

### Thème MUI vs TailwindCSS

| Usage | Outil |
|---|---|
| Composants UI complexes (Dialog, Drawer, Stepper, DatePicker, Tabs) | Material UI |
| Layout, spacing, grilles, fond, hover, responsive | TailwindCSS |
| Cartes, formulaires | TailwindCSS + MUI |
| Animations et transitions | Anime.js |
| Graphiques statistiques | Chart.js via react-chartjs-2 |

### Typographie
- **Titre** : `Poppins` (Google Fonts)
- **Corps** : `Inter`
- **Arabe** : `Cairo` (Google Fonts, RTL)

---

## 10. Animations (Anime.js)

| Contexte | Animation |
|---|---|
| Page d'accueil — Hero | Fade-in + slide-up texte (timeline) |
| Login — Logo CRT | Scale bounce au chargement |
| Dashboard — KPI cards | Counter-up (0 → valeur finale) |
| Sidebar — hover item | Underline slide + color transition |
| Alertes stock | Shake icon si CRITICAL |
| VulnerabilityScore | Circle progress fill animation |
| Hiérarchie tree | Expand/collapse avec height animation |
| Navigation entre pages | Fade transition (React Router + Anime.js) |

---

## 11. Variables d'Environnement

```env
# .env
VITE_API_URL=http://localhost:8081/api/v1
VITE_APP_NAME=NexusAid CRT
VITE_DEFAULT_LANG=fr
```

---

## 12. Extensibilité (Microservices)

Le frontend est conçu pour accueillir de nouveaux microservices sans refactorisation majeure :

1. **Créer un nouveau dossier** dans `src/features/<nouveau_domaine>/`
2. **Ajouter un fichier API** `api/<nouveau_domaine>Api.js` pointant vers la nouvelle base URL
3. **Enregistrer les routes** dans `src/core/config/routes.js`
4. **Ajouter l'entrée Sidebar** dans `Sidebar.jsx` avec permission de rôle
5. **Aucune modification** des autres domaines requise

### Exemple d'ajout d'un service Catastrophes

```
src/features/catastrophes/
├── api/catastrophesApi.js     → VITE_CATASTROPHES_API_URL
├── pages/CatastrophesPage.jsx
└── components/...
```

L'instance Axios peut être variabilisée par domaine si chaque domaine devient un microservice indépendant :

```js
// Exemple : chaque domaine peut pointer vers un service différent
const API_URLS = {
  auth:        import.meta.env.VITE_AUTH_API_URL,
  secourisme:  import.meta.env.VITE_SECOURISME_API_URL,
  sante:       import.meta.env.VITE_SANTE_API_URL,
  // etc.
};
```

---

## 13. Internationalisation (i18n)

- **Langues** : Français (par défaut) + Arabe (RTL)
- **Bibliothèque** : `react-i18next`
- **RTL** : Activé dynamiquement via `document.dir = 'rtl'` + MUI `<CacheProvider>` avec `createCache({ key: 'muirtl' })`
- **Clé de traduction** : Toutes les chaînes visibles extraites dans `fr/common.json` et `ar/common.json`

---

## 14. Plan de Développement Suggéré

| Phase | Modules | Priorité |
|---|---|---|
| **Phase 1** | Auth (Login/Register) + Layout + Dashboard vide | Critique |
| **Phase 2** | Comités + Bénévoles + Profil | Haute |
| **Phase 3** | Inventaire + Alertes + Rapports | Haute |
| **Phase 4** | Secourisme + Diffusion + Jeunesse | Moyenne |
| **Phase 5** | Santé + Action Sociale | Moyenne |
| **Phase 6** | Immigration + VFF | Sensible (dernier) |
| **Phase 7** | i18n Arabe + Animations Anime.js + Polish UI | Finition |

---

## 15. Notes de Sécurité Frontend

1. **Token JWT** stocké dans `localStorage` via Zustand `persist` (considérer `httpOnly cookie` en production)
2. **Module VFF** : Aucune donnée d'identification nominative affichée — référence anonymisée uniquement
3. **RBAC** côté frontend = UX seulement (le backend vérifie toujours les permissions)
4. **Sanitisation** : Toutes les entrées validées via Zod avant envoi API
5. **CORS** : Configurer `VITE_API_URL` correctement pour chaque environnement

---

*Document généré le 26 Février 2026 — NexusAid CRT Frontend Specification v1.0*
