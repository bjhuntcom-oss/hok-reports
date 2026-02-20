# HOK REPORTS

**Plateforme de gestion documentaire du Cabinet HOK**

Application web progressive (PWA) interne destinée aux professionnels du droit du Cabinet HOK. Elle permet l'enregistrement audio de sessions juridiques (consultations, audiences, dépositions, réunions), leur transcription automatique, et la génération de rapports structurés.

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Lancement](#lancement)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Structure du projet](#structure-du-projet)
- [Pages et routes](#pages-et-routes)
- [API Routes](#api-routes)
- [PWA](#pwa)
- [Administration](#administration)
- [Sécurité](#sécurité)
- [Internationalisation](#internationalisation)
- [Scripts utilitaires](#scripts-utilitaires)
- [Déploiement](#déploiement)

---

## Fonctionnalités

### Utilisateurs
- **Enregistrement audio** — Capture audio directe depuis le navigateur (WebRTC/MediaRecorder)
- **Transcription automatique** — Conversion audio-texte via le moteur de traitement intégré
- **Génération de rapports** — Production automatique de rapports juridiques structurés (résumé, points clés, actions, notes juridiques)
- **Gestion des sessions** — Création, consultation, filtrage, recherche
- **Gestion des rapports** — Consultation, filtrage, finalisation, archivage, impression
- **Profil utilisateur** — Modification du nom, changement de mot de passe
- **Tableau de bord** — Statistiques personnelles (sessions, rapports, durée traitée)

### Administration
- **Vue d'ensemble** — Statistiques globales (utilisateurs, sessions, rapports, durée totale)
- **Gestion des utilisateurs** — Liste complète, modification (nom, email), blocage/déblocage, suppression, changement de rôle
- **Tous les rapports** — Accès à l'ensemble des rapports de la plateforme
- **Historique d'activité** — Journal des connexions (IP, user-agent, succès/échec)

### Plateforme
- **PWA** — Installable sur mobile et desktop, fonctionne hors-ligne (cache statique)
- **Design professionnel** — Interface épurée, coins carrés, typographie soignée, branding propriétaire HOK
- **Pages légales** — Mentions légales, politique de confidentialité, CGU
- **Multilingue** — Support français, anglais (Fon en préparation)
- **Consentement cookies** — Bandeau de consentement RGPD
- **Page 404** — Page d'erreur personnalisée avec navigation

---

## Stack technique

| Composant | Technologie |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Runtime** | React 19, TypeScript 5 |
| **Base de données** | SQLite via Prisma v7 + better-sqlite3 |
| **Authentification** | NextAuth v5 (beta) — Credentials provider |
| **State management** | Zustand |
| **Styling** | Tailwind CSS 4, Inter font |
| **Icônes** | Lucide React |
| **Mot de passe** | bcryptjs (hash + salt) |
| **PWA** | Service Worker custom, Web App Manifest |

---

## Architecture

```
hok-reports/
├── prisma/
│   └── schema.prisma          # Schéma de la base de données
├── public/
│   ├── icons/                 # Icônes PWA (192x192, 512x512)
│   ├── favicon.svg            # Favicon SVG (H noir/blanc)
│   ├── manifest.json          # Web App Manifest
│   └── sw.js                  # Service Worker
├── scripts/
│   └── generate-icons.js      # Génération des icônes PWA
├── src/
│   ├── app/                   # Pages et routes (App Router)
│   │   ├── (dashboard)/       # Pages authentifiées (layout avec sidebar)
│   │   ├── api/               # API Routes
│   │   ├── login/             # Page de connexion
│   │   ├── register/          # Page d'inscription
│   │   ├── mentions-legales/  # Mentions légales
│   │   ├── confidentialite/   # Politique de confidentialité
│   │   ├── cgu/               # Conditions générales d'utilisation
│   │   ├── layout.tsx         # Layout racine (PWA, fonts, preloader)
│   │   ├── not-found.tsx      # Page 404
│   │   └── globals.css        # Styles globaux + thème Tailwind
│   ├── components/
│   │   ├── layout/            # Sidebar, Header, DashboardShell
│   │   └── ui/                # Preloader, CookieConsent, SW Register
│   ├── generated/prisma/      # Client Prisma généré
│   ├── lib/
│   │   ├── auth.ts            # Configuration NextAuth (Prisma)
│   │   ├── auth.config.ts     # Configuration NextAuth (Edge/middleware)
│   │   ├── prisma.ts          # Instance Prisma singleton
│   │   ├── i18n.ts            # Traductions (fr/en/fon)
│   │   ├── openai.ts          # Client du moteur de traitement
│   │   └── utils.ts           # Utilitaires (cn, etc.)
│   ├── middleware.ts          # Middleware d'authentification
│   └── stores/                # Stores Zustand
├── dev.db                     # Base SQLite (développement)
├── .env                       # Variables d'environnement
├── prisma.config.ts           # Configuration Prisma v7
└── package.json
```

---

## Installation

### Prérequis

- **Node.js** >= 18.0
- **npm** >= 9.0

### Étapes

```bash
# 1. Cloner le projet
git clone <repository-url>
cd hok-reports

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Modifier .env avec vos valeurs

# 4. Initialiser la base de données
npx prisma db push

# 5. Générer le client Prisma
npx prisma generate

# 6. Générer les icônes PWA
node scripts/generate-icons.js

# 7. Peupler la base (optionnel)
npx tsx prisma/seed.ts
```

---

## Configuration

### Variables d'environnement (`.env`)

```env
# Base de données
DATABASE_URL="file:./dev.db"

# Authentification NextAuth
AUTH_SECRET="votre-secret-nextauth-32-caracteres-minimum"

# Moteur de traitement (transcription et génération de rapports)
OPENAI_API_KEY="sk-..."
```

| Variable | Description | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Chemin vers la base SQLite | Oui |
| `AUTH_SECRET` | Secret pour signer les sessions NextAuth | Oui |
| `OPENAI_API_KEY` | Clé API du moteur de traitement | Non (configurable depuis l'admin) |

> **Note :** La clé du moteur de traitement peut être configurée directement depuis la page Paramètres de l'application par un administrateur.

---

## Lancement

```bash
# Développement (avec Turbopack)
npm run dev

# Production
npm run build
npm run start
```

L'application est accessible sur `http://localhost:3000`.

---

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| **Administrateur** | `admin@hokreports.com` | `Admin123#` |
| **Utilisateur** | `user1@hokreports.com` | `User123#` |

> Ces comptes sont créés par le script de seed (`prisma/seed.ts`).

---

## Pages et routes

### Pages publiques

| Route | Description |
|---|---|
| `/login` | Connexion à la plateforme |
| `/register` | Demande d'accès (création de compte) |
| `/mentions-legales` | Mentions légales du Cabinet HOK |
| `/confidentialite` | Politique de confidentialité (RGPD) |
| `/cgu` | Conditions générales d'utilisation |

### Pages authentifiées (dashboard)

| Route | Description | Rôle requis |
|---|---|---|
| `/dashboard` | Tableau de bord personnel | Utilisateur |
| `/sessions` | Liste des sessions d'enregistrement | Utilisateur |
| `/sessions/new` | Nouvelle session (enregistrement audio) | Utilisateur |
| `/sessions/[id]` | Détail d'une session (audio, transcription, rapports) | Utilisateur |
| `/reports` | Liste des rapports | Utilisateur |
| `/reports/[id]` | Détail d'un rapport (résumé, points clés, actions, impression) | Utilisateur |
| `/profile` | Profil utilisateur (nom, mot de passe) | Utilisateur |
| `/settings` | Paramètres (clé moteur, langue, système) | Admin |
| `/admin` | Administration (stats, utilisateurs, rapports, activité) | Admin |
| `/about` | À propos de HOK Reports | Utilisateur |
| `/documentation` | Documentation intégrée (FAQ par section) | Utilisateur |

---

## API Routes

### Authentification

| Méthode | Route | Description |
|---|---|---|
| `*` | `/api/auth/[...nextauth]` | Endpoints NextAuth (signin, signout, session) |
| `POST` | `/api/register` | Inscription d'un nouvel utilisateur |

### Sessions

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/sessions` | Liste des sessions (filtres: search, status) |
| `POST` | `/api/sessions` | Créer une session |
| `GET` | `/api/sessions/[id]` | Détail d'une session |
| `PATCH` | `/api/sessions/[id]` | Modifier une session |

### Rapports

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/reports` | Liste des rapports (filtres: search, category, status) |
| `POST` | `/api/reports` | Générer un rapport pour une session |
| `GET` | `/api/reports/[id]` | Détail d'un rapport |
| `PATCH` | `/api/reports/[id]` | Modifier le statut d'un rapport |

### Traitement

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/transcribe` | Transcrire l'audio d'une session |
| `POST` | `/api/upload` | Upload d'un fichier audio |

### Profil

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/profile` | Informations du profil |
| `PATCH` | `/api/profile` | Modifier le nom |
| `POST` | `/api/profile/password` | Changer le mot de passe |

### Paramètres

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/settings/engine-status` | Vérifier si la clé moteur est configurée |
| `POST` | `/api/settings/engine-key` | Mettre à jour la clé moteur (admin) |

### Administration

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/admin/users` | Liste de tous les utilisateurs |
| `PATCH` | `/api/admin/users` | Changer le rôle d'un utilisateur |
| `POST` | `/api/admin/users/edit` | Modifier nom/email d'un utilisateur |
| `POST` | `/api/admin/users/block` | Bloquer/débloquer un utilisateur |
| `POST` | `/api/admin/users/delete` | Supprimer un utilisateur |
| `GET` | `/api/admin/stats` | Statistiques globales |
| `GET` | `/api/admin/reports` | Tous les rapports (50 derniers) |
| `GET` | `/api/admin/activity` | Historique des connexions (50 dernières) |

### Autres

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Données du tableau de bord personnel |
| `*` | `/api/notes` | Gestion des notes |

---

## PWA

HOK Reports est une Progressive Web App (PWA) complète :

### Fonctionnalités PWA

- **Installable** — Peut être ajoutée à l'écran d'accueil sur mobile et desktop
- **Hors-ligne** — Pages statiques mises en cache, pages dynamiques servies depuis le cache en cas de perte de connexion
- **Splash screen** — Écran de lancement avec branding HOK
- **Standalone** — Mode plein écran sans barre d'adresse

### Fichiers PWA

| Fichier | Rôle |
|---|---|
| `public/manifest.json` | Manifeste de l'application web |
| `public/sw.js` | Service Worker (cache statique + network-first pour HTML) |
| `public/icons/icon-192.png` | Icône 192x192 (home screen) |
| `public/icons/icon-512.png` | Icône 512x512 (splash screen) |
| `public/favicon.svg` | Favicon SVG vectoriel |
| `src/components/ui/sw-register.tsx` | Composant d'enregistrement du SW |

### Stratégie de cache

| Type de requête | Stratégie |
|---|---|
| Pages HTML | Network-first, fallback cache, puis page offline |
| API (`/api/*`) | Network-first, fallback cache |
| Assets statiques (JS, CSS, images) | Cache-first, fallback réseau |

---

## Administration

L'interface d'administration (`/admin`) est accessible uniquement aux utilisateurs avec le rôle `admin`. Elle propose 4 onglets :

### Vue d'ensemble
- Nombre total d'utilisateurs, sessions, rapports
- Durée audio totale traitée
- Indicateurs visuels

### Utilisateurs
- Liste complète avec sessions/rapports par utilisateur
- **Modifier** — Changer le nom et l'email
- **Bloquer/Débloquer** — Empêcher l'accès sans supprimer le compte
- **Supprimer** — Suppression définitive (cascade sur sessions et rapports)
- **Changer le rôle** — Promouvoir en admin ou rétrograder

### Rapports
- 50 derniers rapports de tous les utilisateurs
- Nom de l'auteur, client, référence, date, statut

### Activité
- Journal des 50 dernières connexions
- Adresse IP, navigateur (user-agent), succès/échec, horodatage

---

## Sécurité

- **Authentification** — Sessions signées via NextAuth v5 (JWT)
- **Mots de passe** — Hashés avec bcryptjs (12 rounds)
- **Middleware** — Toutes les routes `/dashboard/*`, `/sessions/*`, `/reports/*`, `/admin/*`, `/settings/*`, `/profile/*` sont protégées
- **Contrôle de rôle** — Les routes admin vérifient `role === "admin"` côté serveur
- **CSRF** — Protection intégrée NextAuth
- **Blocage de compte** — Un utilisateur bloqué ne peut pas se connecter
- **Edge-compatible** — Le middleware utilise une config séparée sans imports Node.js

---

## Internationalisation

Le système i18n supporte 3 langues via `src/lib/i18n.ts` :

| Code | Langue | Statut |
|---|---|---|
| `fr` | Français | Complet |
| `en` | Anglais | Complet |
| `fon` | Fon (Bénin) | Placeholder |

La langue est configurable par utilisateur dans les paramètres.

---

## Scripts utilitaires

```bash
# Générer les icônes PWA
node scripts/generate-icons.js

# Pousser le schéma vers la base
npx prisma db push

# Régénérer le client Prisma
npx prisma generate

# Peupler la base avec les données de test
npx tsx prisma/seed.ts

# Build de production
npm run build

# Linter
npm run lint
```

---

## Modèle de données (Prisma)

### User
| Champ | Type | Description |
|---|---|---|
| `id` | String (cuid) | Identifiant unique |
| `name` | String | Nom complet |
| `email` | String (unique) | Adresse email |
| `password` | String | Mot de passe hashé |
| `role` | String | `admin` ou `user` |
| `blocked` | Boolean | Compte bloqué |
| `language` | String | Langue préférée (`fr`, `en`, `fon`) |
| `lastLoginAt` | DateTime? | Dernière connexion |
| `createdAt` | DateTime | Date de création |

### Session
| Champ | Type | Description |
|---|---|---|
| `id` | String (cuid) | Identifiant unique |
| `title` | String | Titre de la session |
| `clientName` | String | Nom du client |
| `clientEmail` | String? | Email du client |
| `clientPhone` | String? | Téléphone du client |
| `caseReference` | String? | Référence du dossier |
| `description` | String? | Notes préliminaires |
| `language` | String | Langue de la session |
| `status` | String | `recording`, `transcribing`, `summarizing`, `completed`, `error` |
| `audioUrl` | String? | URL du fichier audio |
| `audioDuration` | Int? | Durée en secondes |

### Report
| Champ | Type | Description |
|---|---|---|
| `id` | String (cuid) | Identifiant unique |
| `title` | String | Titre du rapport |
| `summary` | String | Résumé structuré |
| `keyPoints` | String? | Points clés (JSON array) |
| `actionItems` | String? | Actions à entreprendre (JSON array) |
| `legalNotes` | String? | Notes juridiques |
| `category` | String | `consultation`, `hearing`, `deposition`, `meeting`, `general` |
| `format` | String | `standard`, `detailed`, `brief` |
| `status` | String | `draft`, `final`, `archived` |

### LoginHistory
| Champ | Type | Description |
|---|---|---|
| `id` | String (cuid) | Identifiant unique |
| `ipAddress` | String? | Adresse IP |
| `userAgent` | String? | Navigateur / appareil |
| `success` | Boolean | Connexion réussie |
| `createdAt` | DateTime | Horodatage |
| `userId` | String | Référence utilisateur |

---

## Déploiement

### Production (Node.js)

```bash
npm run build
npm run start
```

L'application écoute par défaut sur le port 3000. Configurez un reverse proxy (Nginx, Caddy) pour le HTTPS.

### Variables de production

```env
DATABASE_URL="file:./prod.db"
AUTH_SECRET="secret-de-production-aleatoire-long"
OPENAI_API_KEY="sk-..."
NODE_ENV="production"
```

### Docker (optionnel)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Licence

Propriétaire — Cabinet HOK. Tous droits réservés.
Usage interne uniquement. Toute reproduction ou distribution non autorisée est interdite.

---

**HOK REPORTS** v0.1.0 — Cabinet HOK © 2025
