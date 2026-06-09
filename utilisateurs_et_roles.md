# Documentation des Utilisateurs et Rôles - Plateforme Nexus-AID

Cette documentation exhaustive présente l'architecture organisationnelle paramétrée de la plateforme Nexus-AID, avec une couverture des cas d'utilisation pour les différents profils, rôles et situations possibles. Les APIs ont été déboguées et rendues totalement fonctionnelles avec la structure de base de données actuelle (Core Service & Gateway).

## 1. Organigramme des Comités Régionaux (Structure Étendue)

Le système a été architecturé pour supporter le maillage territorial complexe d'une organisation d'envergure nationale (ex: Croissant-Rouge). Il prend en charge l'organisation par gouvernorats et délégations.

- **Structure à 24 Comités Régionaux (Gouvernorats) :** Représente les comités principaux de chaque gouvernorat (Tunis, Sfax, Sousse, etc.).
- **Structure étendue à 40 Comités (et plus) :** Inclut les comités régionaux principaux PLUS des comités locaux spécifiques ou des antennes supplémentaires créées pour couvrir des zones de haute vulnérabilité (ex: Comités locaux de la banlieue de Tunis, Sfax Sud, etc.).

La hiérarchie fonctionne avec un système parent-enfant (ex: `parentCommitteeId`) géré dans la base de données. 

## 2. Rôles et Droits d'Accès (RBAC)

- **`ROLE_SUPER_ADMIN`** : Configuration globale, validation des structures de comités, accès à tous les dashboards.
- **`ROLE_ADMIN`** : (Coordinateurs Régionaux) Gestion exclusive des ressources (Volontaires, Dons, Alertes) de leur propre comité régional et de ses comités enfants.
- **`ROLE_PRESIDENT`** : (Rôle de Comité) Président d'un comité régional/local. Valide les adhésions des volontaires.
- **`ROLE_RESP_JEUNESSE`** : (Rôle de Comité) Responsable du comité des jeunes d'une région. Organise les événements et formations.
- **`ROLE_RESP_ACTION_SOCIALE`** : (Rôle de Comité) Gère la vulnérabilité des familles et la distribution des ressources.
- **`ROLE_VOLUNTEER`** : Acteur de terrain. Participe aux missions, peut être formé, assigné à des tâches.
- **`ROLE_DONOR`** : Utilisateur offrant du financement ou du matériel.
- **`ROLE_TRAINER`** : Formateur certifié gérant les sessions de secourisme et autres.

---

## 3. Scénarios Utilisateurs (Comptes de Test)

L'API Gateway (port 8080) / Frontend (ViteJS) sont le point d'entrée pour tester ces différents cas d'utilisation avec les APIs fonctionnelles.

### Scénario A : Le Superviseur National (Niveau Stratégique)
Il a besoin de voir la situation sur tout le territoire national (Dashboard IA, statistiques globales des dons).

| Champ | Valeur |
| :--- | :--- |
| **Email** | `superviseur.national@nexus-aid.org` |
| **Mot de passe** | `admin2026_Secure` |
| **Type/Role** | `ADMIN` / `ROLE_SUPER_ADMIN` |
| **Profil/Situation** | Se connecte pour vérifier le tableau de bord des catastrophes (Disaster Detection) et vérifier les 40 comités. Les APIs lui retournent les données sans filtre régional. |

### Scénario B : Président du Comité Régional de Sfax (Comité parmi les 24)
Il gère son gouvernorat et doit approuver les nouveaux volontaires de sa région.

| Champ | Valeur |
| :--- | :--- |
| **Email** | `president.sfax@nexus-aid.org` |
| **Mot de passe** | `sfax_crs2026` |
| **Type/Role** | `VOLUNTEER` / `ROLE_PRESIDENT` (Comité: Sfax) |
| **Profil/Situation** | Se connecte à l'espace de gestion. Son appel API `/api/v1/profiles/my-committee/volunteers` ne retournera que les volontaires rattachés à l'ID de Sfax. Il filtre les statuts `PENDING` et les approuve. |

### Scénario C : Responsable Jeunesse de Tunis (Comité Local étendu - parmi les 40)
Il organise une formation en secourisme pour les nouveaux recrus.

| Champ | Valeur |
| :--- | :--- |
| **Email** | `jeunesse.tunis@nexus-aid.org` |
| **Mot de passe** | `tunis_jeunesse2026` |
| **Type/Role** | `VOLUNTEER` / `ROLE_RESP_JEUNESSE` (Comité: Tunis) |
| **Profil/Situation** | Accède au `CalendarManager`. Il crée un événement (`createEvent`). Les APIs de calendrier lient automatiquement l'événement au comité de Tunis. Seuls les volontaires de Tunis recevront l'alerte sur leur dashboard. |

### Scénario D : Volontaire Débutant (Situation : Attente de validation)
Nouveau recruteur qui vient de s'inscrire via le portail public.

| Champ | Valeur |
| :--- | :--- |
| **Email** | `nouveau.volontaire@gmail.com` |
| **Mot de passe** | `volontaireNew123` |
| **Type/Role** | `VOLUNTEER` / Aucun rôle comité approuvé. |
| **Profil/Situation** | Statut du compte: `PENDING`. S'il essaie de se connecter aux modules internes, l'`AuthService` le bloque ou lui donne un accès en lecture seule limité à `MyProfilePage`. Il doit attendre l'approbation du Président (Scénario B). |

### Scénario E : Volontaire Confirmé sur le terrain
Volontaire actif participant à des actions de distribution.

| Champ | Valeur |
| :--- | :--- |
| **Email** | `amine.terrain@mail.com` |
| **Mot de passe** | `terrainV2026` |
| **Type/Role** | `VOLUNTEER` / Statut : `APPROVED`. |
| **Profil/Situation** | Peut voir les actualités (`getVisibleNews`), s'inscrire aux événements de secourisme (`registerForEvent`), et liker les articles. Son comité parent peut le dispatcher sur la carte pour les alertes GEE. |

### Scénario F : Le Donateur
Un partenaire externe qui propose des lits de camp.

| Champ | Valeur |
| :--- | :--- |
| **Email** | `entreprise.donatrice@company.com` |
| **Mot de passe** | `donateur2026` |
| **Type/Role** | `DONOR` / `ROLE_DONOR` |
| **Profil/Situation** | Création d'un enregistrement dans le service logistique. Accède aux tableaux de bord limités pour suivre l'acheminement de sa contribution. |

---

## 4. Points Clés Techniques Validés

Toutes ces situations sont désormais supportées par le back-end fraîchement corrigé :
1. **Typage et compilation Java réparés** : Les contrôleurs peuvent instancier et exécuter tout type de compte sans erreur de compilation (erreurs de Lombok `getType` et `getCommitteeId` résolues).
2. **Synchronisation Frontend** : Les DTO côtés frontend (`CalendarEventDTO`, `User`) incluent maintenant les champs vitaux pour supporter la vue de ces comptes (ex: le champ `roles` et `committeeName`).
3. **Multi-Tenancy par Comité** : L'accès par API filtre rigoureusement l'accès de l'utilisateur à son propre comité par défaut (protection au niveau du Data JPA layer).
