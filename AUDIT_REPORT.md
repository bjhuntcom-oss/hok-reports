# 🔍 Rapport d'Audit Complet — HOK Reports

**Date** : 11 mars 2026  
**Périmètre** : 36 routes API, 12 fichiers lib/, middleware, auth, frontend  
**Méthode** : Lecture ligne par ligne + tests Playwright E2E

---

## RÉSUMÉ EXÉCUTIF

| Sévérité | Nombre |
|----------|--------|
| 🔴 CRITIQUE | 4 |
| 🟠 HAUTE | 7 |
| 🟡 MOYENNE | 8 |
| 🔵 BASSE | 7 |
| **Total** | **26 findings** |

---

## 🔴 CRITIQUE — Corrections urgentes

### C1. WhatsApp Webhook sans authentification ni validation de signature
**Fichier** : `src/app/api/whatsapp/webhook/route.ts`  
**Ligne** : 40  
**Détail** : Le endpoint POST n'a AUCUNE vérification d'authenticité. `validateWebhookSignature()` dans `whatsapp.ts:109-121` retourne toujours `true`. N'importe qui peut envoyer de faux messages WhatsApp et créer des HearingReports en base.  
**Impact** : Injection de fausses données juridiques dans la base.  
**Fix** : Implémenter la vérification HMAC-SHA256 avec `x-hub-signature-256` header.

### C2. Notes POST — pas de sanitization du contenu
**Fichier** : `src/app/api/notes/route.ts`  
**Ligne** : 14  
**Détail** : `content` est stocké brut sans appel à `sanitizeString()`. Si affiché sans échappement côté client → XSS stocké.  
**Impact** : Un utilisateur peut injecter du JavaScript via une note.  
**Fix** : `const content = sanitizeString(body.content || "")` et ajouter `limit: .slice(0, 5000)`.

### C3. Hearing Reports GET — pas de filtre par userId pour les non-admins
**Fichier** : `src/app/api/hearing-reports/route.ts`  
**Ligne** : 21  
**Détail** : Contrairement aux routes `sessions` et `reports` qui filtrent par `userId` pour les non-admins, `hearing-reports` retourne TOUS les rapports d'audience à tout utilisateur authentifié.  
**Impact** : Fuite de données — un utilisateur normal voit les dossiers de tout le cabinet.  
**Fix** : Ajouter `if (role !== "admin") { where.userId = userId; }`.

### C4. Hearing Reports [id] — pas de contrôle de propriété
**Fichier** : `src/app/api/hearing-reports/[id]/route.ts`  
**Lignes** : 7-28 (GET), 31-78 (PATCH), 81-114 (DELETE)  
**Détail** : Aucune vérification que l'utilisateur est propriétaire du hearing report. Tout utilisateur authentifié peut lire, modifier ou supprimer n'importe quel rapport d'audience.  
**Impact** : Modification/suppression non autorisée de données juridiques.  
**Fix** : Ajouter `if (role !== "admin" && report.userId !== userId) { return 403 }`.

---

## 🟠 HAUTE — Corrections importantes

### H1. Reports POST — pas de contrôle de propriété sur sessionId
**Fichier** : `src/app/api/reports/route.ts`  
**Ligne** : 73-78  
**Détail** : N'importe quel utilisateur authentifié peut générer un rapport pour n'importe quelle session en fournissant un `sessionId` arbitraire. Pas de vérification `sessionData.userId !== userId`.  
**Fix** : Ajouter contrôle de propriété après récupération de la session.

### H2. Weekly Roles — pas de contrôle de propriété
**Fichier** : `src/app/api/weekly-roles/[id]/route.ts`  
**Lignes** : 6-28 (GET), 30-68 (PATCH), 71-104 (DELETE)  
**Détail** : Comme pour hearing-reports, aucun contrôle de propriété. Tout utilisateur peut lire/modifier/supprimer n'importe quel rôle hebdomadaire.  
**Fix** : Ajouter vérification `role.userId !== userId`.

### H3. `allowDangerousEmailAccountLinking: true`
**Fichier** : `src/lib/auth.ts:16` et `src/lib/auth.config.ts:13`  
**Détail** : Permet à un compte Google de s'associer à un compte existant avec le même email SANS vérification. Un attaquant contrôlant un Google account avec l'email d'un utilisateur existant peut prendre le contrôle du compte.  
**Impact** : Account hijacking potentiel.  
**Fix** : Retirer `allowDangerousEmailAccountLinking` ou implémenter une vérification par email.

### H4. Upload — type check contournable
**Fichier** : `src/app/api/upload/route.ts`  
**Ligne** : 33  
**Détail** : `if (file.type && ...)` — si `file.type` est vide/undefined, le check est entièrement bypassed. Un fichier malveillant peut être uploadé.  
**Fix** : `if (!file.type || !ALLOWED_AUDIO_TYPES.includes(file.type))`.

### H5. Path Traversal potentiel dans transcribe et flash
**Fichiers** : `transcribe/route.ts:35`, `flash/route.ts:39`  
**Détail** : `path.join(process.cwd(), "public", sessionData.audioUrl)` — si `audioUrl` contient `../../`, il y a path traversal. L'upload génère des noms sûrs, mais `audioUrl` vient de la BDD sans validation à la lecture.  
**Fix** : Valider que `audioUrl.startsWith("/uploads/audio/")` et ne contient pas `..`.

### H6. Flash route expose les erreurs internes
**Fichier** : `src/app/api/flash/route.ts`  
**Ligne** : 117  
**Détail** : `{ error: error.message }` renvoie le message d'erreur brut au client, pouvant exposer des stack traces, chemins internes ou infos de BDD.  
**Fix** : Retourner un message générique et logger l'erreur détaillée.

### H7. Pas de Content-Security-Policy
**Fichier** : `src/middleware.ts`  
**Détail** : Les security headers incluent `X-Frame-Options`, `X-XSS-Protection` etc., mais pas de `Content-Security-Policy`. Les navigateurs modernes s'appuient sur CSP.  
**Fix** : Ajouter un header CSP approprié.

---

## 🟡 MOYENNE — Améliorations à planifier

### M1. `openai.ts` est du code mort
**Fichier** : `src/lib/openai.ts`  
**Détail** : Ce fichier n'est importé nulle part dans `src/` (vérifié par grep). Il duplique la fonctionnalité de `llm.ts` et contient un client Groq redondant.  
**Fix** : Supprimer le fichier ou le marquer comme déprécié.

### M2. Pagination non bornée dans reports et hearing-reports
**Fichiers** : `reports/route.ts:21-22`, `hearing-reports/route.ts:17-18`, `weekly-roles/route.ts:39-40`  
**Détail** : `limit` n'est pas borné (`Math.min/max`). Un client peut demander `limit=999999` et récupérer toute la base.  
**Référence** : La route `sessions/route.ts:20` fait correctement `Math.min(100, Math.max(1, ...))`.  
**Fix** : Appliquer le même pattern partout.

### M3. Reports GET — search non sanitisé
**Fichier** : `src/app/api/reports/route.ts`  
**Ligne** : 18  
**Détail** : `search` n'est pas passé par `sanitizeString()` contrairement à `sessions/route.ts:17`. Prisma protège contre l'injection SQL, mais incohérence.  
**Fix** : Ajouter `sanitizeString()`.

### M4. Dashboard route charge toutes les sessions
**Fichier** : `src/app/api/dashboard/route.ts`  
**Lignes** : 21-24  
**Détail** : `prisma.session.findMany({ where, select: { audioDuration: true } })` charge TOUTES les sessions pour calculer la durée totale. Même problème dans `admin/stats/route.ts:16`.  
**Fix** : Utiliser `prisma.session.aggregate({ _sum: { audioDuration: true } })`.

### M5. Rate limiting in-memory uniquement
**Fichier** : `src/lib/rate-limit.ts`  
**Détail** : La `Map` est en mémoire et reset au redémarrage du serveur (PM2 restart). Pas partagé entre instances.  
**Impact** : Brute-force possible en relançant les requêtes après restart.  
**Fix pour prod** : Utiliser Redis ou la table `SystemSetting` pour persister les compteurs.

### M6. Admin peut se rétrograder
**Fichier** : `src/app/api/admin/users/route.ts` PATCH  
**Détail** : Pas de vérification que `userId !== adminId` pour le changement de rôle. Un admin peut se mettre en `user` et se bloquer.  
**Fix** : Interdire la modification de son propre rôle.

### M7. Block/Delete user — pas de vérification d'existence du target
**Fichiers** : `admin/users/block/route.ts:21`, `admin/users/delete/route.ts:25`  
**Détail** : `target` peut être `null` si l'utilisateur n'existe pas. `prisma.user.update/delete` lancerait une exception Prisma non gérée proprement.  
**Fix** : Ajouter `if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })`.

### M8. Hearing reports PATCH — status non validé
**Fichier** : `src/app/api/hearing-reports/[id]/route.ts`  
**Ligne** : 60  
**Détail** : `body.status` est directement assigné sans validation. Un utilisateur pourrait mettre n'importe quelle valeur.  
**Fix** : Valider que status est dans `["active", "archived", "cancelled"]`.

---

## 🔵 BASSE — Nettoyage et améliorations mineures

### B1. Commentaire obsolète dans whatsapp-parser.ts
**Fichier** : `src/lib/whatsapp-parser.ts`  
**Lignes** : 5-6  
**Détail** : Le commentaire mentionne encore "GPT-4o/Claude" alors que tout est maintenant Groq.  
**Fix** : Mettre à jour le commentaire.

### B2. Variable `lowerText` déclarée mais inutilisée
**Fichier** : `src/lib/whatsapp-parser.ts`  
**Ligne** : 67  
**Détail** : `lowerText` est déclarée dans `detectHearingReportAI` mais jamais utilisée (les `trivialPatterns` utilisent `text` directement).  
**Fix** : Supprimer la variable ou l'utiliser.

### B3. Label i18n `admin.activeProvider` orphelin
**Fichier** : `src/lib/i18n.ts`  
**Lignes** : 290 (FR), 714 (EN)  
**Détail** : Ce label n'est plus utilisé dans aucun composant après la migration Groq-only.  
**Fix** : Supprimer le label.

### B4. Health endpoint expose le nombre d'utilisateurs
**Fichier** : `src/app/api/health/route.ts`  
**Ligne** : 10  
**Détail** : `userCount` est accessible sans authentification. Information mineure mais non nécessaire pour un health check.  
**Fix** : Retirer `userCount` ou ajouter une authentification.

### B5. Docs password en fallback hardcodé
**Fichier** : `src/app/api/docs/route.ts`  
**Ligne** : 6  
**Détail** : `process.env.DOCS_PASSWORD || "HokDocs2026#"` — le mot de passe par défaut est en clair dans le code source.  
**Fix** : Retirer le fallback et rendre la variable d'env obligatoire.

### B6. Service Worker SSL dans les console errors
**Détail** : Le service worker (`sw.js`) échoue à s'enregistrer à cause d'erreurs SSL. Le certificat Let's Encrypt semble avoir un problème ou être auto-signé.  
**Fix** : Vérifier et renouveler le certificat TLS Traefik.

### B7. Double endpoint pour sauvegarder la clé Groq
**Fichiers** : `admin/llm/route.ts` (POST) et `settings/engine-key/route.ts` (POST)  
**Détail** : Deux routes font la même chose — sauvegarder `groq_api_key` en BDD et dans `process.env`.  
**Fix** : Consolider en un seul endpoint.

---

## ✅ POINTS POSITIFS CONSTATÉS

- **Authentification** : Toutes les routes API vérifient `auth()` sauf health (normal) et webhook WhatsApp (à corriger)
- **Autorisation admin** : Routes `/api/admin/*` vérifient systématiquement `role === "admin"` 
- **Ownership** : Routes sessions, reports, notes vérifient `userId` pour les non-admins
- **Sanitization** : `sanitizeString()` bien appliqué sur les champs principaux (titres, noms, etc.)
- **SQL Injection** : Prisma ORM utilisé partout, aucune requête raw dans le code applicatif
- **Audit trail** : `logAudit()` appelé sur toutes les actions mutatives (create, update, delete)
- **Rate limiting** : Appliqué sur login et register
- **Password policy** : Minimum 8 chars, majuscule, minuscule, chiffre, caractère spécial
- **Security headers** : X-Frame-Options DENY, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Middleware** : Protection des routes dans `authorized()` callback
- **Field filtering** : `filterReportFields()` et `filterSessionFields()` limitent les champs modifiables

---

## STATUT DES CORRECTIONS APPLIQUÉES

| # | Finding | Statut | Fichier(s) modifié(s) |
|---|---------|--------|----------------------|
| C2 | Notes: sanitize content | ✅ Corrigé | `notes/route.ts` |
| C3 | Hearing-reports GET: filtre userId | ✅ Corrigé | `hearing-reports/route.ts` |
| C4 | Hearing-reports [id]: contrôle propriété | ✅ Corrigé | `hearing-reports/[id]/route.ts` |
| H1 | Reports POST: ownership check | ✅ Corrigé | `reports/route.ts` |
| H2 | Weekly-roles [id]: ownership check | ✅ Corrigé | `weekly-roles/[id]/route.ts` |
| H4 | Upload: type check non contournable | ✅ Corrigé | `upload/route.ts` |
| H5 | Path traversal guard | ✅ Corrigé | `transcribe/route.ts`, `flash/route.ts` |
| H6 | Flash: erreur interne masquée | ✅ Corrigé | `flash/route.ts` |
| M1 | Suppression openai.ts (code mort) | ✅ Corrigé | Fichier supprimé |
| M2 | Pagination bornée | ✅ Corrigé | `reports/route.ts`, `hearing-reports/route.ts`, `weekly-roles/route.ts` |
| M3 | Reports search sanitization | ✅ Corrigé | `reports/route.ts` |
| M7 | Block/Delete user existence check | ✅ Corrigé | `admin/users/block/route.ts`, `admin/users/delete/route.ts` |
| B1 | Commentaire obsolète whatsapp-parser | ✅ Corrigé | `whatsapp-parser.ts` |
| C1 | WhatsApp webhook signature | ⏳ À faire (15 min, besoin appSecret Meta) |
| H3 | allowDangerousEmailAccountLinking | ⏳ À évaluer (impact UX Google login) |
| H7 | Content-Security-Policy | ⏳ À faire (config dépendante des ressources chargées) |
| M4 | Dashboard aggregate query | ⏳ Optimisation future |
| M5 | Rate limiting Redis | ⏳ Infrastructure future |
| M6 | Admin self-demotion guard | ⏳ À faire |
| M8 | Hearing-reports status validation | ⏳ À faire |
| B2-B5,B7 | Nettoyage mineur | ⏳ À faire |

**Build** : ✅ Succès (0 erreur, 0 warning)

---

## MATRICE DE PRIORITÉ

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| C3 | hearing-reports GET: filtre userId | 2 min | 🔴 Fuite données |
| C4 | hearing-reports [id]: contrôle propriété | 5 min | 🔴 IDOR |
| H1 | reports POST: contrôle sessionId ownership | 3 min | 🟠 IDOR |
| C2 | notes POST: sanitize content | 1 min | 🔴 XSS |
| H2 | weekly-roles [id]: contrôle propriété | 5 min | 🟠 IDOR |
| H4 | upload: fix type check | 1 min | 🟠 Upload bypass |
| H5 | transcribe/flash: path traversal guard | 3 min | 🟠 LFI |
| C1 | WhatsApp webhook: signature validation | 15 min | 🔴 Injection données |
| M2 | Pagination bornée partout | 5 min | 🟡 DoS |
| M1 | Supprimer openai.ts mort | 1 min | 🟡 Nettoyage |
