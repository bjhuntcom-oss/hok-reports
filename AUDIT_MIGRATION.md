# Audit Complet HOK-Reports & Plan de Migration VPS

## Date : 10 Mars 2026

---

# 1. AUDIT CODEBASE

## 1.1 Stack Technique
| Élément | Version / Détail |
|---------|-----------------|
| **Framework** | Next.js 16.1.6 (App Router, Turbopack) |
| **React** | 19.1.0 |
| **ORM** | Prisma 7.4.0 + @prisma/adapter-pg |
| **Base de données** | PostgreSQL (Supabase, pooler PgBouncer) |
| **Auth** | NextAuth v5.0.0-beta.30 (Credentials + Google OAuth) |
| **AI/LLM** | OpenAI (Whisper-1 + GPT-4o) / Anthropic (Claude Sonnet 4) |
| **État client** | Zustand |
| **UI** | Tailwind CSS + Shadcn/ui + Lucide Icons |
| **i18n** | Personnalisé (fr/en/fon) |
| **PWA** | Service Worker + manifest.json |
| **Sécurité** | Rate limiting, sanitization XSS, audit logging, CORS, CSP, HSTS |

## 1.2 Structure du Projet
```
hok-reports/
├── prisma/
│   ├── schema.prisma          # 10 modèles, PostgreSQL
│   ├── migrations/
│   └── seed.ts                # Seed admin + user
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # 13 pages protégées
│   │   ├── api/               # 26+ routes API
│   │   ├── login/
│   │   ├── register/
│   │   ├── platform-docs/
│   │   ├── cgu/ confidentialite/ mentions-legales/
│   │   ├── layout.tsx
│   │   └── page.tsx           # Redirect → dashboard/login
│   ├── components/
│   │   ├── layout/            # sidebar, header, dashboard-shell
│   │   └── ui/                # Shadcn components
│   ├── lib/
│   │   ├── auth.ts + auth.config.ts  # NextAuth (edge-split)
│   │   ├── prisma.ts          # PrismaClient + pg Pool
│   │   ├── llm.ts             # OpenAI/Anthropic dual provider
│   │   ├── openai.ts          # Legacy OpenAI direct
│   │   ├── whatsapp.ts        # WhatsApp Cloud API helper
│   │   ├── whatsapp-parser.ts # AI-powered parser
│   │   ├── audit.ts           # Audit logging
│   │   ├── rate-limit.ts      # In-memory rate limiter
│   │   ├── sanitize.ts        # XSS prevention
│   │   ├── store.ts           # Zustand store
│   │   ├── i18n.ts            # Internationalisation
│   │   └── utils.ts           # cn() helper
│   └── generated/prisma/      # Prisma client généré
├── public/
│   ├── uploads/audio/         # Fichiers audio uploadés
│   ├── manifest.json
│   └── sw.js
├── docs/
│   └── PLATFORM_DOCUMENTATION.html
├── .env
├── next.config.ts
├── prisma.config.ts
├── tsconfig.json
└── package.json
```

## 1.3 Routes API (26 endpoints)

### Auth & Utilisateurs
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handlers |
| `/api/register` | POST | Inscription (rate-limited) |
| `/api/profile` | GET/PATCH | Profil utilisateur |
| `/api/profile/password` | POST | Changement mot de passe |

### Sessions & Transcription
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/sessions` | GET/POST | Liste/création sessions |
| `/api/sessions/[id]` | GET/PATCH/DELETE | CRUD session individuelle |
| `/api/upload` | POST | Upload audio (→ public/uploads/audio/) |
| `/api/transcribe` | POST | Transcription via Whisper |
| `/api/notes` | POST/DELETE | Notes de session |
| `/api/flash` | POST | Pipeline complet: transcription + metadata + rapport |

### Rapports
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/reports` | GET/POST | Liste/génération rapports AI |
| `/api/reports/[id]` | GET/PATCH/DELETE | CRUD rapport |
| `/api/reports/[id]/pdf` | GET | Export HTML/PDF |

### WhatsApp
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/whatsapp/webhook` | GET/POST | Webhook Meta (vérification + messages) |
| `/api/whatsapp/status` | GET | Statut configuration (admin) |
| `/api/whatsapp/test` | POST | Simulateur test (admin) |

### Audiences & Rôles
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/hearing-reports` | GET/POST | Comptes-rendus d'audience |
| `/api/weekly-roles` | GET/POST | Rôles hebdomadaires |

### Administration
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/admin/users` | GET/PATCH | Liste utilisateurs / changer rôle |
| `/api/admin/users/approve` | POST | Approuver/rejeter inscription |
| `/api/admin/users/block` | POST | Bloquer/débloquer utilisateur |
| `/api/admin/users/delete` | POST | Supprimer utilisateur |
| `/api/admin/users/edit` | POST | Modifier nom/email |
| `/api/admin/stats` | GET | Statistiques globales |
| `/api/admin/activity` | GET | Historique connexions |
| `/api/admin/audit` | GET | Journal d'audit |
| `/api/admin/reports` | GET | Tous les rapports |
| `/api/admin/llm` | GET/POST | Config clés API LLM |
| `/api/admin/llm/test` | POST | Test validité clés API |

### Système
| Route | Méthodes | Description |
|-------|----------|-------------|
| `/api/health` | GET | Health check |
| `/api/dashboard` | GET | Stats dashboard |
| `/api/docs` | POST | Documentation protégée par mot de passe |
| `/api/settings/engine-key` | POST | Mise à jour clé OpenAI |
| `/api/settings/engine-status` | GET | Statut configuration moteurs AI |

## 1.4 Pages Frontend (20 pages)

### Dashboard (protégées)
- `/dashboard` — Tableau de bord principal
- `/sessions` — Liste des sessions
- `/sessions/new` — Nouvelle session
- `/sessions/[id]` — Détail session
- `/flash` — Enregistrement flash (pipeline complet)
- `/reports` — Liste des rapports
- `/reports/[id]` — Détail rapport
- `/roles` — Rôles d'audience hebdomadaires
- `/admin` — Administration (admin seulement)
- `/profile` — Profil utilisateur
- `/settings` — Paramètres (LLM, WhatsApp)
- `/documentation` — Documentation plateforme
- `/about` — À propos

### Publiques
- `/login` — Connexion
- `/register` — Inscription
- `/platform-docs` — Documentation publique
- `/cgu` — Conditions générales
- `/confidentialite` — Politique de confidentialité
- `/mentions-legales` — Mentions légales

## 1.5 Schéma Base de Données (10 modèles Prisma)

| Modèle | Champs clés | Relations |
|--------|------------|-----------|
| **User** | id, name, email, password, role, status, blocked, language | → sessions, reports, notes, loginHistory, hearingReports, weeklyRoles, auditLogs |
| **Session** | id, title, clientName, caseReference, audioUrl, audioDuration, language, status | → user, transcription, reports, notes |
| **Transcription** | id, content, segments, language | → session |
| **Report** | id, title, summary, keyPoints, actionItems, legalNotes, category, format, exportedAt | → session, user |
| **Note** | id, content | → session, user |
| **LoginHistory** | id, success, ipAddress, userAgent | → user |
| **SystemSetting** | key (unique), value | — |
| **HearingReport** | id, hearingDate, jurisdiction, chamber, caseReference, clientName, opponent, lawyerName, outcome, nextHearingDate, tasks, notes, source, whatsappMessageId, whatsappSender, status | → user |
| **WeeklyRole** | id, weekStart, weekEnd, title, entries, generatedAt, status | → user |
| **AuditLog** | id, action, entity, entityId, details, ipAddress, userAgent | → user |

## 1.6 Points d'attention codebase
- **Stockage fichiers audio** : `public/uploads/audio/` — stockage local sur disque (pas de CDN/S3)
- **Rate limiting** : in-memory (se réinitialise au redémarrage)
- **No migrations Supabase** : les tables ont été créées via `prisma db push`, pas de migrations Prisma enregistrées
- **process.env mutation** : les routes `/api/admin/llm` et `/api/settings/engine-key` modifient `process.env` à l'exécution
- **Auth edge-split** : `auth.config.ts` (edge) + `auth.ts` (Node.js) — nécessaire car Prisma ne tourne pas en edge
- **fs.readFile** dans `/api/transcribe` et `/api/flash` — lit les fichiers audio depuis le filesystem

---

# 2. AUDIT SUPABASE

## 2.1 Projet
| Paramètre | Valeur |
|-----------|--------|
| **Projet** | hok-reports |
| **ID** | alrirvvzdnykclobajkd |
| **Région** | eu-west-3 (Paris) |
| **Plan** | Free |
| **Instance** | t4g.nano |
| **Statut** | En cours de réactivation (était pausé depuis le 27/02/2026) |
| **Organisation** | BJHUNT (bvogpgxbioqthbgyjlmx) |
| **URL API** | https://alrirvvzdnykclobajkd.supabase.co |

## 2.2 DATABASE_URL
```
postgresql://postgres.alrirvvzdnykclobajkd:QF0vkOEfCLIJNmOH@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true
```
> ⚠️ Important : le hostname est `aws-1` et non `aws-0`

## 2.3 Tables et Données (vérifié via Table Editor + SQL Editor)

| Table | Enregistrements | RLS | Notes |
|-------|----------------|-----|-------|
| **User** | 2 | ❌ Désactivé | admin@hokreports.com (admin), user1@hokreports.com (user) |
| **Session** | 0 | ❌ Désactivé | — |
| **Transcription** | 0 | ❌ Désactivé | — |
| **Report** | 0 | ❌ Désactivé | — |
| **Note** | 0 | ❌ Désactivé | — |
| **LoginHistory** | 0 | ❌ Désactivé | — |
| **SystemSetting** | 0 | ❌ Désactivé | — |
| **HearingReport** | 0 | ❌ Désactivé | — |
| **WeeklyRole** | 0 | ❌ Désactivé | — |
| **AuditLog** | 0 | ❌ Désactivé | — |

## 2.4 Alertes de Sécurité Supabase
- ⚠️ **RLS désactivé** sur les 10 tables publiques — données accessibles via l'API Supabase sans restriction
- ⚠️ **Colonnes sensibles exposées** : `public.User.password` est exposé via l'API sans RLS
- ℹ️ L'app utilise Prisma directement (pas le client Supabase JS), donc le RLS n'est pas critique pour l'app elle-même, mais la surface d'attaque via l'API REST Supabase est ouverte

## 2.5 Observations
- **1 migration Prisma** enregistrée : `initial_schema`
- **Pas de backups** configurés (plan Free)
- **Pas de Edge Functions** déployées
- **Pas de Storage buckets** Supabase (fichiers audio stockés localement sur le serveur)
- **Base quasi vide** : uniquement les 2 utilisateurs seed, aucune donnée métier

---

# 3. AUDIT VPS

## 3.1 Système
| Paramètre | Valeur |
|-----------|--------|
| **OS** | Ubuntu 25.10 (Questing Quokka) |
| **Kernel** | 6.17.0-8-generic |
| **Hostname** | mail |
| **IP** | 82.25.117.79 |
| **CPU** | 8 cœurs |
| **RAM** | 31 GB (24 GB disponibles) |
| **Disque** | 387 GB total, 325 GB disponibles (17% utilisé) |
| **Node.js** | v20.19.4 |
| **npm** | 9.2.0 |
| **PM2** | 6.0.14 (global) |

## 3.2 Services existants (NE PAS TOUCHER)

### Docker Containers (actifs)
| Container | Image | Ports | Usage |
|-----------|-------|-------|-------|
| **dokploy** | dokploy:v0.26.7 | 0.0.0.0:3000 | Panel de déploiement |
| **dokploy-traefik** | traefik:v3.6.7 | 80, 443 | Reverse proxy + TLS |
| **dokploy-postgres** | postgres:16 | 5432 (interne) | BD Dokploy |
| **dokploy-redis** | redis:7 | 6379 (interne) | Cache Dokploy |
| **bjhunt-backend** | backend-bjhunt-backend | 127.0.0.1:3001 | API BJHunt |
| **bjhunt-ollama** | ollama/ollama | 127.0.0.1:11434 | LLM local |
| **bjhunt-valkey** | valkey/valkey | 127.0.0.1:6379 | Cache BJHunt |
| **bjhunt-kali-mcp** | custom | 127.0.0.1:8000 | Kali MCP |
| **whunt-redis** | redis:7-alpine | 127.0.0.1:6380 | Cache Whunt |
| **pg-bridge** | alpine/socat | 127.0.0.1:15432 | Bridge PostgreSQL |
| **mailcow-*** (14 containers) | mailcow stack | 25,465,587,993,995,4190,8843,8880 | Mail server complet |

### PM2 Processes
| Nom | Script | Port | Status |
|-----|--------|------|--------|
| **whunt** | /opt/whunt/dist/index.js | 5000 | online |

### Traefik Routes Configurées
| Domaine | Service | Backend |
|---------|---------|---------|
| `api.bjhunt.com` | bjhunt-api | http://bjhunt-backend:3001 |
| `mail.fluxdev.io` | mailcow-web | http://172.17.0.1:8880 |
| `app.whatsbj.bjhunt.com` | (cert existant) | — |

### Certificats TLS (Let's Encrypt)
- `api.bjhunt.com`
- `mail.fluxdev.io`
- `app.whatsbj.bjhunt.com`

### Firewall (UFW)
- **ALLOW** : 22, 80, 443, 25, 465, 587, 993, 4190, 5000, 8888
- **DENY** : 3000, 3001, 3002, 6379, 8001, 11434

### Crontab
- `0 2 * * *` — Backup PostgreSQL BJHunt

## 3.3 Ressources disponibles pour HOK-Reports
- **RAM libre** : ~24 GB — largement suffisant
- **Disque libre** : ~325 GB — largement suffisant
- **CPU** : 8 cœurs — largement suffisant
- **Ports occupés** : 3000 (Dokploy), 3001 (BJHunt API), 5000 (Whunt)
- **Port suggéré pour HOK** : 3002 ou 4000

---

# 4. PLAN DE MIGRATION DÉTAILLÉ

## 4.1 Architecture cible

```
Internet → Traefik (443/80) → hok-reports (PM2, port 3002)
                             → api.bjhunt.com (Docker, port 3001)  [EXISTANT]
                             → mail.fluxdev.io (Mailcow)           [EXISTANT]
```

## 4.2 Prérequis
1. **Domaine DNS** : configurer un sous-domaine (ex: `hok.bjhunt.com` ou domaine dédié) pointant vers `82.25.117.79`
2. **BD PostgreSQL** : continuer à utiliser Supabase OU installer PostgreSQL local
3. **Variables d'environnement** : préparer le `.env` de production

## 4.3 Étapes de migration

### Étape 1 — Préparer le VPS
```bash
# Créer le répertoire
mkdir -p /opt/hok-reports
cd /opt/hok-reports

# Installer les dépendances build si nécessaire
npm install -g pnpm  # ou utiliser npm
```

### Étape 2 — Déployer le code
```bash
# Option A: Git clone
git clone https://github.com/bjhuntcom-oss/hok-reports.git .

# Option B: Upload direct depuis la machine locale
# (via scp ou rsync)
```

### Étape 3 — Configurer l'environnement
```bash
# Créer .env de production
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres.alrirvvzdnykclobajkd:QF0vkOEfCLIJNmOH@aws-1-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true"
AUTH_SECRET="<GÉNÉRER UN NOUVEAU SECRET>"
NEXTAUTH_URL="https://<DOMAINE>"
OPENAI_API_KEY="<CLÉ>"
ANTHROPIC_API_KEY="<CLÉ>"
WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_VERIFY_TOKEN="hok-whatsapp-verify-2026"
WHATSAPP_BUSINESS_ACCOUNT_ID=""
PORT=3002
EOF
```

### Étape 4 — Build et démarrage
```bash
npm install
npx prisma generate
npm run build

# Créer le répertoire uploads
mkdir -p public/uploads/audio
```

### Étape 5 — Configuration PM2
```bash
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: "hok-reports",
    script: "node_modules/.bin/next",
    args: "start -p 3002",
    cwd: "/opt/hok-reports",
    env: {
      NODE_ENV: "production",
      PORT: 3002
    },
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "1G",
    log_file: "/opt/hok-reports/logs/pm2-combined.log",
    error_file: "/opt/hok-reports/logs/pm2-error.log",
    out_file: "/opt/hok-reports/logs/pm2-out.log",
  }]
};
EOF

mkdir -p logs
pm2 start ecosystem.config.cjs
pm2 save
```

### Étape 6 — Configuration Traefik
```yaml
# /etc/dokploy/traefik/dynamic/hok-reports.yml
http:
  routers:
    hok-reports:
      rule: "Host(`<DOMAINE>`)"
      entryPoints:
        - websecure
      service: hok-reports
      tls:
        certResolver: letsencrypt
    hok-reports-http:
      rule: "Host(`<DOMAINE>`)"
      entryPoints:
        - web
      middlewares:
        - redirect-to-https
      service: hok-reports

  services:
    hok-reports:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3002"
        passHostHeader: true
```

### Étape 7 — Firewall
```bash
# Le port 3002 reste interne (Traefik fait le proxy)
# Pas besoin d'ouvrir le port dans UFW
```

### Étape 8 — Vérification
```bash
# Test local
curl http://127.0.0.1:3002/api/health

# Test via domaine
curl https://<DOMAINE>/api/health
```

## 4.4 Considérations importantes

### Base de données
- **Option A** (recommandée pour commencer) : Garder Supabase — pas de changement de DATABASE_URL
  - ⚠️ Le projet est sur plan Free → risque de pause automatique après 7 jours d'inactivité
  - Latence réseau VPS (France) → Supabase eu-west-3 (Paris) = faible latence
- **Option B** (recommandée long terme) : PostgreSQL local sur le VPS
  - Installer PostgreSQL 16+ en Docker
  - Migrer les données depuis Supabase via `pg_dump`/`pg_restore`
  - Zéro latence réseau, pas de risque de pause

### Fichiers audio
- Le répertoire `public/uploads/audio/` doit être persistant
- Envisager un backup régulier

### Sécurité production
- Générer un nouveau `AUTH_SECRET` (ne pas réutiliser celui de dev)
- Mettre à jour `NEXTAUTH_URL` avec le domaine réel
- Configurer les clés API LLM valides

---

# 5. RÉSUMÉ

| Composant | État actuel | Action requise |
|-----------|-------------|---------------|
| **Codebase** | Complète, 20 pages, 26+ API routes | Aucune modification nécessaire |
| **Supabase BD** | Pausée, en réactivation | Décider: garder Supabase ou migrer vers PG local |
| **VPS** | Opérationnel, ressources abondantes | Configurer nouveau service |
| **Traefik** | Fonctionnel, Let's Encrypt actif | Ajouter route pour HOK |
| **DNS** | À configurer | Pointer sous-domaine vers VPS |
| **PM2** | Déjà installé et utilisé | Ajouter process hok-reports |

**Prêt pour la migration** ✓ — En attente de :
1. Choix du domaine
2. Réactivation complète de Supabase (si option A)
3. Feu vert pour procéder
