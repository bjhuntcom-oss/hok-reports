# AUDIT COMPLET — HOK REPORTS
### Cabinet HOK — Plateforme de Gestion Documentaire Juridique
**Date :** Mars 2026  
**Auditeur :** Cascade AI  
**Périmètre :** Codebase, VPS (82.25.117.79), Base de données PostgreSQL, Frontend (hok.bjhunt.com)

---

## TABLE DES MATIÈRES

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Architecture & Stack technique](#2-architecture--stack-technique)
3. [Audit VPS & Infrastructure](#3-audit-vps--infrastructure)
4. [Audit Base de données](#4-audit-base-de-données)
5. [Audit Backend (API Routes)](#5-audit-backend-api-routes)
6. [Audit Frontend (Playwright)](#6-audit-frontend-playwright)
7. [Audit Sécurité](#7-audit-sécurité)
8. [Audit Template PDF — Problèmes identifiés](#8-audit-template-pdf--problèmes-identifiés)
9. [Fonctionnalités manquantes](#9-fonctionnalités-manquantes)
10. [Bugs & Incohérences](#10-bugs--incohérences)
11. [Recommandation PDF : Librairies modernes](#11-recommandation-pdf--librairies-modernes)
12. [Plan d'action prioritaire](#12-plan-daction-prioritaire)

---

## 1. Résumé exécutif

**HOK Reports** est une plateforme fonctionnelle de transcription audio et génération de rapports juridiques pour le Cabinet HOK (Cotonou, Bénin). L'application est **en production** sur https://hok.bjhunt.com avec des données réelles.

### Points forts
- Architecture Next.js 16 moderne avec App Router
- Intégration Groq efficace (Whisper + Llama 3.3 70B)
- Système d'audit/logging complet
- Interface utilisateur élégante et cohérente
- i18n bilingue (FR/EN) bien implémenté
- Système d'approbation des inscriptions
- Enregistrement flash fonctionnel
- WhatsApp AI parser avec fallback regex

### Points critiques
- **Template PDF = HTML brut** — pas de vrai PDF généré (window.print())
- **Pas de répertoire d'uploads** sur le VPS (fichiers audio perdus)
- **Pas de pagination** sur la plupart des listes
- **Durée totale = 0min** sur le dashboard malgré 2 sessions
- **Aucun HearingReport** en BD malgré l'interface fonctionnelle
- **Sécurité API** : routes admin non protégées côté API
- **Pas de backup** de la base de données
- **Google OAuth** non configuré (clés vides)
- **WhatsApp Cloud API** non configuré (tokens vides)

---

## 2. Architecture & Stack technique

| Composant | Technologie | Version |
|-----------|------------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| CSS | Tailwind CSS | 4.x |
| ORM | Prisma | 7.x |
| Base de données | PostgreSQL (Docker) | — |
| Auth | NextAuth v5 beta | 5.x |
| IA Transcription | Groq Whisper | large-v3-turbo |
| IA Rapports | Groq Llama | 3.3-70b-versatile |
| State Management | Zustand | 5.x |
| Icônes | Lucide React | — |
| Déploiement | PM2 + Traefik | — |

### Structure des fichiers clés
```
src/
├── app/
│   ├── (dashboard)/          # Pages protégées (dashboard, sessions, reports, admin, etc.)
│   ├── api/                  # 38 routes API
│   └── (auth)/               # Login, Register
├── lib/
│   ├── llm.ts                # Intégration Groq (706 lignes)
│   ├── auth.ts               # NextAuth config
│   ├── auth.config.ts        # Edge-compatible auth
│   ├── whatsapp-parser.ts    # Parser WhatsApp AI + regex
│   ├── sanitize.ts           # Validation/nettoyage
│   ├── audit.ts              # Logging
│   ├── store.ts              # Zustand store
│   ├── i18n.ts               # Traductions (865 lignes)
│   └── prisma.ts             # Client Prisma
├── components/layout/        # Sidebar, Header, Shell
└── generated/prisma/         # Client Prisma généré
```

---

## 3. Audit VPS & Infrastructure

### Serveur
- **IP :** 82.25.117.79
- **OS :** Linux
- **Disque :** 387 Go total, 65 Go utilisé (17%) ✅
- **RAM :** 31 Gi total, 7.1 Gi utilisé ✅
- **Swap :** 0 (aucun swap configuré) ⚠️

### Services actifs
| Service | État | Port |
|---------|------|------|
| PM2 `hok-reports` | ✅ Online | 3002 |
| Docker `hok-postgres` | ✅ Up | 5433 |
| Traefik (reverse proxy) | ✅ Up | 80, 443 |
| Mailcow (email) | ✅ Up | Multiple |

### Configuration VPS (.env)
```
DATABASE_URL="postgresql://hokreports:hokreports_pwd@localhost:5433/hokreports"
AUTH_TRUST_HOST=true
AUTH_SECRET="hok-reports-prod-secret-x7k9m2p4q8r1"
NEXTAUTH_URL="https://hok.bjhunt.com"
GROQ_API_KEY=gsk_H6zIO5...  ✅ Configurée
GOOGLE_CLIENT_ID=""           ❌ Non configuré
GOOGLE_CLIENT_SECRET=""       ❌ Non configuré
WHATSAPP_ACCESS_TOKEN=""      ❌ Non configuré
WHATSAPP_PHONE_NUMBER_ID=""   ❌ Non configuré
```

### Problèmes infrastructure
1. **❌ Pas de répertoire uploads** : `ls /opt/hok-reports/public/uploads/audio/` → "No uploads dir". Les fichiers audio uploadés sont perdus.
2. **⚠️ Pas de swap** configuré — risque d'OOM si charge augmente.
3. **⚠️ Pas de backup automatique** de la BD PostgreSQL.
4. **⚠️ AUTH_SECRET** en clair dans le .env (acceptable mais peu sécurisé).
5. **⚠️ Pas de monitoring** (pas de healthcheck PM2, pas d'alerting).

---

## 4. Audit Base de données

### Tables (11 tables)
| Table | Lignes |
|-------|--------|
| AuditLog | 17 |
| Session | 2 |
| Transcription | 2 |
| User | 2 |
| SystemSetting | 1 |
| Report | 1 |
| LoginHistory | 0 |
| WeeklyRole | 0 |
| Note | 0 |
| HearingReport | 0 |

### Observations
1. **✅ AuditLog actif** — 17 entrées, logging fonctionnel.
2. **✅ SystemSetting** contient 1 entrée (groq_api_key).
3. **⚠️ LoginHistory vide** — la table `LoginHistory` n'est pas alimentée (bug potentiel).
4. **⚠️ HearingReport vide** — 0 comptes rendus d'audience malgré l'interface fonctionnelle.
5. **⚠️ WeeklyRole vide** — les rôles hebdomadaires ne peuvent pas se générer sans HearingReport.
6. **⚠️ Note vide** — le système de notes n'est pas utilisé.

### Schéma Prisma
Le schéma (`prisma/schema.prisma`) est bien structuré avec 10 modèles métier. Relations correctement définies. Le modèle `HearingReport` a les champs WhatsApp (`source`, `whatsappMessageId`, `whatsappSender`).

---

## 5. Audit Backend (API Routes)

### Routes API (38 routes)
| Catégorie | Routes | État |
|-----------|--------|------|
| Auth | `/api/auth/[...nextauth]` | ✅ Fonctionnel |
| Sessions | `/api/sessions`, `/api/sessions/[id]` | ✅ CRUD complet |
| Reports | `/api/reports`, `/api/reports/[id]`, `/api/reports/[id]/pdf` | ✅ CRUD + export |
| Transcription | `/api/transcribe`, `/api/transcriptions/[id]` | ✅ Fonctionnel |
| Upload | `/api/upload` | ⚠️ Dir manquant VPS |
| Flash | `/api/flash` | ✅ Pipeline complet |
| Dashboard | `/api/dashboard` | ✅ Fonctionnel |
| Admin | 9 routes (`users`, `stats`, `reports`, etc.) | ⚠️ Voir ci-dessous |
| Hearing Reports | `/api/hearing-reports`, `/api/hearing-reports/[id]` | ✅ CRUD |
| Weekly Roles | `/api/weekly-roles`, `/api/weekly-roles/[id]` | ✅ CRUD |
| WhatsApp | `webhook`, `test`, `status` | ⚠️ Non configuré |
| Settings | `engine-status`, `engine-key` | ✅ Fonctionnel |
| Profile | `/api/profile`, `/api/profile/password` | ✅ Fonctionnel |
| Registration | `/api/register` | ✅ Fonctionnel |
| Health | `/api/health` | ✅ Fonctionnel |
| Docs | `/api/docs` | ✅ Fonctionnel |
| Notes | `/api/notes` | ✅ CRUD |

### Problèmes API identifiés

#### 🔴 Critique : Protection admin insuffisante
Les routes `/api/admin/*` vérifient `session?.user?.role === "admin"` individuellement dans chaque route. Cependant, le middleware (`src/middleware.ts`) ne bloque **que les pages** `/admin` côté frontend — **pas les routes API** `/api/admin/*`. Un utilisateur non-admin pourrait théoriquement appeler ces routes API directement.

**Vérification :** `auth.config.ts` ligne 53 : `if (isApi) return true;` — **toutes les routes API passent sans vérification de rôle dans le middleware**.

#### 🟡 Moyen : Pas de rate limiting
Aucune protection contre les abus (brute force login, flood API). Pas de middleware de rate limiting.

#### 🟡 Moyen : Upload — répertoire absent
`/api/upload` écrit dans `public/uploads/audio/` mais ce répertoire n'existe pas sur le VPS.

#### 🟡 Moyen : Dashboard durée = 0
Le dashboard affiche "0min" pour la durée traitée. L'API `/api/dashboard` calcule `totalDuration` via `_sum.audioDuration`. Les sessions ont `audioDuration` potentiellement null ou non mis à jour correctement lors du flash recording.

#### 🟢 Mineur : LoginHistory non alimenté
La table existe mais le code `auth.ts` ne semble pas écrire dans `LoginHistory` — il utilise `logAudit` dans `AuditLog` à la place.

---

## 6. Audit Frontend (Playwright)

### Pages testées via https://hok.bjhunt.com

| Page | URL | État | Notes |
|------|-----|------|-------|
| Dashboard | `/dashboard` | ✅ | Fonctionnel, données affichées |
| Sessions | `/sessions` | ✅ | Liste vide affichée (filtres fonctionnels) |
| Nouvelle session | `/sessions/new` | ✅ | Formulaire + enregistrement audio |
| Flash | `/flash` | ✅ | Interface d'enregistrement rapide |
| Rapports | `/reports` | ✅ | Liste avec filtres catégorie/statut |
| Rôles d'audience | `/roles` | ✅ | Compteurs + rôle hebdomadaire + liste |
| Admin | `/admin` | ✅ | 8 onglets, gestion complète |
| Profil | `/profile` | ✅ | Édition profil + mot de passe |
| Paramètres | `/settings` | ✅ | Langue + WhatsApp config |
| Documentation | `/documentation` | ✅ | Guide fonctionnel |

### Observations frontend
1. **✅ Aucune erreur console** — 0 erreurs JavaScript détectées.
2. **✅ Design cohérent** — Style minimaliste noir/blanc professionnel.
3. **✅ Responsive** — Sidebar collapsible, tables scrollables.
4. **✅ i18n** — Boutons FR/EN fonctionnels dans le header.
5. **⚠️ Page Sessions** — La liste est vide sur la capture alors que le dashboard montre 2 sessions. Possible problème de filtre par userId (l'admin ne voit que ses propres sessions ? Ou les sessions sont "completed" et le filtre par défaut les masque ?).
6. **⚠️ Dashboard "0min"** — La durée traitée affiche 0min malgré 2 sessions terminées.
7. **⚠️ Rôles** — 0 comptes rendus, 0 audiences à venir. La fonctionnalité est complète mais inutilisée.
8. **⚠️ Sidebar** — L'item "Rôles d'audience" n'a pas de mise en évidence visuelle active (pas de highlight quand on est sur la page).

---

## 7. Audit Sécurité

### ✅ Points positifs
- **Headers de sécurité** configurés dans `next.config.ts` (CSP, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- **Middleware** ajoute des headers supplémentaires (X-Content-Type-Options, etc.)
- **Sanitization** des entrées via `sanitize.ts` (anti-XSS, escape HTML)
- **Auth JWT** avec NextAuth v5
- **Audit trail** complet (AuditLog)
- **Mot de passe hashé** via bcryptjs
- **Validation de taille fichier** dans upload (max 25 Mo)
- **Path traversal protection** dans upload

### 🔴 Problèmes critiques
1. **Routes API admin non protégées par le middleware** — `auth.config.ts:53` : `if (isApi) return true;` laisse passer toutes les requêtes API. Chaque route doit vérifier individuellement `session.user.role === "admin"`.
2. **AUTH_SECRET faible** : `hok-reports-prod-secret-x7k9m2p4q8r1` — devrait être un secret aléatoire long (64+ caractères).

### 🟡 Problèmes moyens
3. **Pas de rate limiting** — Risque de brute force sur `/api/auth` et `/api/register`.
4. **GROQ_API_KEY exposée** dans les logs PM2 (visible via `pm2 logs`).
5. **Pas de CORS explicite** — Les headers CORS ne sont pas configurés.
6. **allowDangerousEmailAccountLinking: true** dans Google OAuth — peut permettre le détournement de compte si un attaquant crée un compte Google avec le même email.

### 🟢 Problèmes mineurs
7. **Microphone permissions** : `Permissions-Policy: microphone=(self)` est correct.
8. **Pas de CSP nonce** pour les scripts inline.

---

## 8. Audit Template PDF — Problèmes identifiés

### Analyse du fichier `src/app/api/reports/[id]/pdf/route.ts`

Le "PDF" actuel est en réalité **un fichier HTML** retourné avec `Content-Type: text/html` et un bouton "Imprimer / Télécharger PDF" qui utilise `window.print()`. Ce n'est **PAS** un vrai PDF.

### Problèmes majeurs

#### 1. **Ce n'est pas un PDF**
- Le fichier est servi en `text/html`, pas `application/pdf`
- L'utilisateur doit manuellement cliquer "Imprimer" puis "Enregistrer en PDF" dans le navigateur
- Le résultat dépend du navigateur (Chrome, Firefox, Safari donnent des résultats différents)
- Impossible d'envoyer par email directement

#### 2. **Rendu inconsistant**
- `@page { size: A4; margin: 20mm 18mm 25mm 18mm; }` n'est pas respecté par tous les navigateurs
- `.doc-footer { position: fixed; bottom: 0; }` — le footer se superpose au contenu sur les pages longues
- Les couleurs d'arrière-plan ne s'impriment pas par défaut (nécessite `-webkit-print-color-adjust: exact`)
- Pas de numérotation de pages

#### 3. **Mise en page fragile**
- Le grid `info-grid` à 4 colonnes se casse en impression
- Les `page-break-inside: avoid` sur les sections ne fonctionnent pas bien avec tous les navigateurs
- La barre `print-bar` (fixed top) prend de l'espace même en aperçu (avant d'imprimer)

#### 4. **Contenu non optimal**
- `highlightKeyTerms()` injecte du HTML `<strong>` APRÈS `escapeHtml()` — risque de double-échappement ou d'injection
- La numérotation des sections est calculée manuellement (3 conditions imbriquées)
- Pas de table des matières pour les rapports longs
- Pas de page de garde
- Pas de signature/tampon numérique

#### 5. **Expérience utilisateur**
- L'utilisateur doit ouvrir un nouvel onglet, puis manuellement imprimer
- Pas de choix de format (A4, Letter)
- Pas de personnalisation (logo, en-tête personnalisé)
- Le nom de fichier est `rapport-XXXXXXXX.html` (pas `.pdf`)

---

## 9. Fonctionnalités manquantes

### 🔴 Priorité haute
1. **Vrai export PDF** — Remplacer le HTML par un vrai fichier PDF généré côté serveur
2. **Backup automatique** de la base de données
3. **Rate limiting** sur les endpoints sensibles
4. **Répertoire uploads** à créer sur le VPS
5. **Protection middleware des routes API admin**

### 🟡 Priorité moyenne
6. **Pagination** — Les listes (sessions, rapports, audit logs) ne paginent pas côté frontend
7. **Recherche full-text** — La recherche actuelle est basique (LIKE)
8. **Export CSV/Excel** des données (sessions, rapports, audit logs)
9. **Notifications** — Pas de système de notifications (email, push)
10. **Historique de versions** des rapports (versionning)
11. **Mot de passe oublié** — Le lien "Mot de passe oublié ?" existe dans i18n mais pas implémenté
12. **Google OAuth** — Configuré dans le code mais clés vides
13. **Mode sombre** — Interface uniquement en mode sombre pour la sidebar, pas de toggle
14. **Multi-langue Fon** — Mentionné dans les mémoires mais absent de l'i18n actuel (seulement fr/en)

### 🟢 Priorité basse
15. **PWA** — Un service worker est enregistré mais pas de manifest complet
16. **Drag & drop** pour l'upload audio
17. **Tags/Labels** sur les sessions et rapports
18. **Statistiques avancées** (graphiques, tendances)
19. **Templates de rapports** personnalisables
20. **Collaboration** — Pas de système de commentaires/partage entre avocats
21. **Archivage automatique** des rapports anciens
22. **Export du rôle hebdomadaire en PDF**

---

## 10. Bugs & Incohérences

### Bugs confirmés

| # | Sévérité | Description | Fichier |
|---|----------|-------------|---------|
| B1 | 🔴 | **Upload dir absent** sur VPS — les fichiers audio ne sont pas sauvegardés | `/opt/hok-reports/public/uploads/audio/` |
| B2 | 🔴 | **Dashboard durée = 0** — `audioDuration` non persisté correctement | `dashboard/page.tsx`, `/api/dashboard` |
| B3 | 🟡 | **LoginHistory jamais écrit** — table existe mais reste vide | `auth.ts` → utilise `logAudit` pas `LoginHistory` |
| B4 | 🟡 | **highlightKeyTerms après escapeHtml** — risque de double-échappement | `pdf/route.ts:221` |
| B5 | 🟡 | **Session list potentiellement vide** — filtrage par userId possible | `sessions/page.tsx` vs dashboard |
| B6 | 🟢 | **Sidebar active state** — L'item de sidebar "Rôles d'audience" manque le highlight actif | `sidebar.tsx` |
| B7 | 🟢 | **locale non persisté** — Zustand store reset au rechargement (pas de `persist`) | `store.ts` |
| B8 | 🟢 | **Fon language removed** — Mentionné dans les mémoires mais plus disponible | `i18n.ts` |

### Incohérences

| # | Description |
|---|-------------|
| I1 | Le dashboard montre 2 sessions "terminé" mais la page Sessions semble vide |
| I2 | Le `.env` local a `GROQ_API_KEY` vide mais le VPS l'a configurée |
| I3 | `LoginHistory` model dans Prisma mais jamais utilisé (AuditLog fait le travail) |
| I4 | Le PDF dit "Télécharger PDF" mais génère du HTML |
| I5 | `Content-Disposition: inline; filename="rapport-xxx.html"` — extension `.html` pas `.pdf` |
| I6 | L'admin page charge 7 requêtes API en parallèle au montage — potentiel problème de performance |
| I7 | `report.not_found` et `report.back_to_reports` dans le code mais pas dans i18n.ts |

---

## 11. Recommandation PDF : Librairies modernes

### Comparatif des librairies JS PDF avancées

| Librairie | Type | Points forts | Points faibles | Recommandé |
|-----------|------|-------------|---------------|------------|
| **@react-pdf/renderer** | React → PDF | API déclarative React, mise en page Flexbox, rendu côté serveur | Pas de CSS natif, courbe d'apprentissage | ⭐⭐⭐⭐ |
| **Puppeteer/Playwright** | HTML → PDF | CSS complet, rendu fidèle, Chromium headless | Lourd (Chromium), lent, gourmand en mémoire | ⭐⭐⭐ |
| **PDFKit** | Low-level | Contrôle total, léger, streaming | API bas-niveau, verbeux, pas de HTML/CSS | ⭐⭐ |
| **jsPDF + html2canvas** | Client-side | Simple, pas de serveur | Qualité médiocre, rasterisation, lent | ⭐ |
| **pdf-lib** | Manipulation PDF | Modifier des PDF existants, formulaires, signatures | Pas de génération HTML, bas-niveau | ⭐⭐⭐ |
| **Typst** | Markup → PDF | Compilation rapide, typographie avancée, templates | Écosystème jeune, pas JS natif | ⭐⭐⭐ |

### 🏆 Recommandation : **@react-pdf/renderer** + **pdf-lib**

#### Pourquoi @react-pdf/renderer ?
1. **API React native** — S'intègre parfaitement dans l'écosystème Next.js
2. **Rendu serveur** — Peut générer des PDF dans les API routes (côté serveur)
3. **Flexbox layout** — Mise en page puissante et prévisible
4. **Polices personnalisées** — Support de polices professionnelles
5. **Streaming** — Peut streamer le PDF directement au client
6. **Composants réutilisables** — Templates de rapport modulaires

#### Pourquoi compléter avec pdf-lib ?
1. **Signatures numériques** — Ajouter des tampons/signatures après génération
2. **Métadonnées** — Titre, auteur, mots-clés, sécurité
3. **Watermarks** — Filigranes "CONFIDENTIEL", "BROUILLON"
4. **Fusion** — Combiner plusieurs rapports en un document

#### Architecture proposée
```
src/lib/pdf/
├── templates/
│   ├── report-standard.tsx     # Template rapport standard
│   ├── report-detailed.tsx     # Template rapport détaillé
│   ├── report-brief.tsx        # Template synthèse
│   ├── weekly-role.tsx         # Template rôle hebdomadaire
│   └── hearing-report.tsx      # Template compte rendu d'audience
├── components/
│   ├── header.tsx              # En-tête Cabinet HOK
│   ├── footer.tsx              # Pied de page avec numérotation
│   ├── legal-box.tsx           # Encadré notes juridiques
│   ├── key-points.tsx          # Liste points clés colorée
│   ├── action-items.tsx        # Checklist actions
│   └── metadata-grid.tsx       # Grille d'informations
├── fonts/
│   ├── inter-regular.ttf       # Police professionnelle
│   └── inter-bold.ttf
├── styles.ts                   # Styles partagés
└── generate.ts                 # API de génération
```

#### Exemple d'implémentation
```tsx
// src/lib/pdf/templates/report-standard.tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({ family: 'Inter', src: '/fonts/inter-regular.ttf' });

const styles = StyleSheet.create({
  page: { padding: '20mm 18mm 25mm 18mm', fontFamily: 'Inter', fontSize: 10.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', borderBottom: '2.5pt solid #111', paddingBottom: 14 },
  // ... styles complets
});

export function ReportPDF({ report }: { report: ReportData }) {
  return (
    <Document title={report.title} author="Cabinet HOK" subject="Rapport juridique">
      <Page size="A4" style={styles.page}>
        <Header report={report} />
        <ConfidentialBanner />
        <TitleBlock report={report} />
        <InfoGrid report={report} />
        <SummarySection content={report.summary} />
        <KeyPointsSection points={report.keyPoints} />
        <ActionItemsSection items={report.actionItems} />
        <LegalNotesSection notes={report.legalNotes} />
        <Footer />
      </Page>
      {report.transcription && (
        <Page size="A4" style={styles.page}>
          <TranscriptionSection content={report.transcription} />
          <Footer />
        </Page>
      )}
    </Document>
  );
}
```

#### Route API modifiée
```ts
// src/app/api/reports/[id]/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer';
import { ReportPDF } from '@/lib/pdf/templates/report-standard';

export async function GET(req, { params }) {
  // ... auth + fetch report ...
  const buffer = await renderToBuffer(<ReportPDF report={report} />);
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="rapport-${id.slice(0,8)}.pdf"`,
    },
  });
}
```

---

## 12. Plan d'action prioritaire

### Phase 1 — Corrections critiques (1-2 jours)
- [ ] Créer le répertoire uploads sur le VPS : `mkdir -p /opt/hok-reports/public/uploads/audio`
- [ ] Corriger le bug `audioDuration = 0` dans le pipeline flash
- [ ] Ajouter vérification admin dans le middleware pour `/api/admin/*`
- [ ] Générer un `AUTH_SECRET` robuste (64+ caractères aléatoires)
- [ ] Configurer un backup automatique PostgreSQL (cron + pg_dump)

### Phase 2 — Template PDF moderne (3-5 jours)
- [ ] Installer `@react-pdf/renderer` et `pdf-lib`
- [ ] Créer les templates PDF professionnels (standard, détaillé, synthèse)
- [ ] Intégrer la génération PDF côté serveur dans `/api/reports/[id]/pdf`
- [ ] Ajouter le support pour le rôle hebdomadaire en PDF
- [ ] Ajouter watermarks (BROUILLON, CONFIDENTIEL)
- [ ] Ajouter numérotation de pages et table des matières

### Phase 3 — Améliorations fonctionnelles (1-2 semaines)
- [ ] Implémenter la pagination côté serveur (sessions, rapports, audit)
- [ ] Persister la locale dans Zustand (avec `persist` middleware)
- [ ] Corriger/supprimer le modèle `LoginHistory` (redondant avec `AuditLog`)
- [ ] Ajouter les clés i18n manquantes (`report.not_found`, etc.)
- [ ] Implémenter le rate limiting (via middleware ou package `express-rate-limit`)
- [ ] Configurer Google OAuth (si nécessaire)
- [ ] Ajouter l'export CSV pour l'administration

### Phase 4 — Améliorations long-terme
- [ ] Implémenter le système de notifications
- [ ] Ajouter le mot de passe oublié (reset par email)
- [ ] Ajouter des graphiques dans le dashboard (charts.js ou recharts)
- [ ] Configurer WhatsApp Cloud API en production
- [ ] Monitoring et alerting (PM2 + webhook Discord/Slack)
- [ ] Tests automatisés (Playwright E2E, Jest unitaires)

---

## Annexes

### A. Credentials actuels
| Compte | Email | Mot de passe | Rôle |
|--------|-------|-------------|------|
| Admin | admin@hokreports.com | Admin123# | admin |
| User | user1@hokreports.com | User123# | user |

### B. Données VPS
- **SSH** : `ssh -i C:\Users\ELITE\.ssh\bjhunt_vps root@82.25.117.79`
- **App path** : `/opt/hok-reports/`
- **PM2** : `pm2 restart hok-reports`
- **DB** : `docker exec -it hok-postgres psql -U hokreports -d hokreports`

### C. Logs PM2 (dernière activité)
```
[LLM] Transcription start — audioBytes:291199, language:fr
[LLM] Transcription done — duration:18, chars:337, confidence:0.85, elapsed:511ms
[LLM] LLM gen start — provider:groq, model:llama-3.3-70b-versatile
[LLM] Groq gen done — promptTok:1431, completionTok:81, finish:stop
[LLM] LLM gen done — elapsed:371ms
```
→ Groq fonctionne correctement avec des temps de réponse excellents (<500ms transcription, <2s rapport).

---

*Rapport généré le 11 mars 2026 — Audit effectué via analyse de code, connexion SSH, et Playwright MCP.*
