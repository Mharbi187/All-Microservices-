# Système de Reporting Unifié — Nexus-AID

## Objectif

Créer une interface de reporting **complète et fonctionnelle à 100%** qui centralise tout le cycle de vie des rapports dans une seule page par profil utilisateur, en respectant la hiérarchie **NATIONAL → RÉGIONAL → LOCAL** du backend.

## Analyse de l'existant

Le backend est déjà complet :
- `GET/POST /api/v1/admin/templates` — CRUD templates avec scope NATIONAL/REGIONAL/LOCAL
- `GET/POST /api/v1/admin/reports` — CRUD rapports avec workflow DRAFT→SUBMITTED→VALIDATED→FINALIZED→ARCHIVED
- `POST /api/v1/admin/reports/{id}/submit|validate|finalize|archive` — transitions workflow
- `POST /api/v1/admin/templates/versions/{id}/publish` — publication de version

Le frontend a des pages fragmentées et incomplètes :
- `TemplateListPage` — basique, sans scope ni filtre hiérarchique
- `TemplateBuilderPage` — fonctionnel mais sans gestion du scope dans l'UI
- `AdminReportListPage` — basique, sans affectation ni hiérarchie
- `ReportFillPage` / `ReportDetailPage` — bons mais sans actions selon le rôle
- `ReportsPage` — rapports mensuels legacy, non utilisée

---

## Matrice des permissions par rôle

| Fonctionnalité | PRESIDENT_NATIONAL | PRESIDENT_REGIONAL | PRESIDENT_LOCAL | SG_NATIONAL | SG_REGIONAL | SG_LOCAL | RESP_* | VOLUNTEER |
|---|---|---|---|---|---|---|---|---|
| Créer template NATIONAL | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Créer template REGIONAL | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Créer template LOCAL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Affecter rapport | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Remplir rapport assigné | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Valider rapport | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Finaliser rapport | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Archiver rapport | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Voir tous les rapports du niveau | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔔 notif seulmt |

---

## Proposed Changes

### 1. Service Layer — Nouvelles méthodes API

#### [MODIFY] adminReportService.ts
Ajouter :
- `assign(reportId, assigneeId)` → `POST /reports/{id}/assign`
- `getAssigned()` → `GET /reports/assigned`

#### [MODIFY] templateBuilderService.ts
Ajouter :
- `getByScope(scope)` → `GET /templates?scope=NATIONAL`
- `getPublishedVersions(templateId)` → les versions publiées d'un template

---

### 2. Page principale unifiée : `ReportingHubPage.tsx`

**Route** : `/reporting` (remplace `/reports`, `/admin-reports`, `/templates`)

Cette page est **la page centrale** du système de reporting. Elle adopte un layout avec **onglets latéraux** selon le rôle de l'utilisateur :

```
┌─────────────────────────────────────────────────────────┐
│  NEXUS-AID  │  Système de Reporting                      │
├─────────────┬───────────────────────────────────────────┤
│  [Sidebar]  │  [Contenu principal]                       │
│             │                                            │
│  📊 Tableau  │  Stats globales + rapports récents         │
│  📋 Rapports │  Liste avec filtres hiérarchiques          │
│  📝 Modèles  │  Gestion templates (si autorisé)           │
│  🔔 Notifs  │  Rapports assignés à remplir               │
│  📈 Analyse │  Statistiques par niveau                   │
└─────────────┴───────────────────────────────────────────┘
```

**Comportement selon le rôle** :
- **PRESIDENT / SG** → voient tous les onglets
- **RESP_*** → voient Rapports + Modèles (LOCAL) + Notifs
- **VOLUNTEER** → voient uniquement Notifs (rapports assignés)

---

### 3. Composant : `ReportAssignModal.tsx`
Modal permettant d'affecter un rapport à un utilisateur (volontaire, responsable).
- Sélecteur de template publié (filtré par scope)
- Sélecteur d'assigné (liste des volontaires du comité)
- Titre + niveau d'urgence
- Confirmation

---

### 4. Composant : `TemplateBuilderPage.tsx` (améliorations)
- Ajouter le sélecteur de **scope** dans le header (NATIONAL/REGIONAL/LOCAL selon le rôle)
- Ajouter le panneau **Propriétés** complet pour chaque type d'élément (actuellement vide avec TODO)
- Ajouter bouton **Publier la version** depuis l'UI

---

### 5. Composant : `HierarchyFilterBar.tsx`
Barre de filtres avec la hiérarchie des comités :
```
[Niveau: Tous ▼]  [Gouvernorat: Tous ▼]  [Comité: Tous ▼]  [Statut ▼]  [Recherche]
```

---

### 6. Mise à jour des routes

#### [MODIFY] routes.tsx
- Ajouter `/reporting` → `ReportingHubPage`
- Garder les anciennes routes fonctionnelles (ne pas casser l'existant)

---

### 7. Mise à jour du menu de navigation

#### [MODIFY] MainLayout (sidebar)
- Ajouter "Reporting" dans le menu principal avec l'icône appropriée

---

## Plan d'exécution (ordre)

1. **Étendre les types** (`template.types.ts`) — AssignReport, HierarchyLevel
2. **Étendre adminReportService** — assign, getAssigned
3. **Créer `ReportAssignModal`** — composant d'affectation
4. **Créer `HierarchyFilterBar`** — composant filtres hiérarchiques
5. **Améliorer `TemplateBuilderPage`** — scope selector + properties panel
6. **Créer `ReportingHubPage`** — page centrale unifiée avec tous les onglets
7. **Mettre à jour les routes** — ajouter `/reporting`
8. **Mettre à jour la sidebar** — ajouter le lien de navigation

---

## Questions ouvertes

> [!IMPORTANT]
> **Q1 — Backend d'affectation** : L'API `POST /reports/{id}/assign` avec un `assigneeId` existe-t-elle côté backend ? Si non, doit-on simuler l'affectation dans le frontend (juste créer le draft avec le bon `filledBy`) ou implémenter l'endpoint backend ?

> [!IMPORTANT]
> **Q2 — Notification** : Pour les volontaires qui ont un rapport assigné, doit-on utiliser un système temps-réel (WebSocket) ou juste un polling API (`GET /reports/assigned`) ?

> [!IMPORTANT]
> **Q3 — Route** : Voulez-vous remplacer complètement `/reports` et `/admin-reports` par `/reporting`, ou garder les deux en parallèle ?

## Verification Plan

- Test visuel de l'interface pour chaque rôle simulé
- Vérification que les boutons de workflow (valider, finaliser, archiver) apparaissent uniquement pour les rôles autorisés
- Vérification que les onglets de templates sont masqués pour les volontaires
- Test de création d'un template → publication → création de rapport → remplissage → soumission → validation
