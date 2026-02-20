# HOK REPORTS - Dependencies to Install

Run these commands **in order** when network is back:

## Step 1: Install all npm packages
```powershell
npm install prisma @prisma/client
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install openai
npm install uuid
npm install -D @types/bcryptjs @types/uuid ts-node
```

## Step 2: Generate Prisma client & push schema to SQLite
```powershell
npx prisma generate
npx prisma db push
```

## Step 3: Seed the database with admin + demo user
```powershell
npx ts-node --compiler-options "{\"module\":\"commonjs\"}" prisma/seed.ts
```
Or add to package.json prisma.seed and run `npx prisma db seed`.

## Step 4: Start the dev server
```powershell
npm run dev
```

## Default credentials (after seeding)
- **Admin**: admin@hokreports.com / Admin123#
- **User**: user1@hokreports.com / User123#

## Environment Variables (.env) — already created
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="hok-reports-secret-change-in-production-2024"
OPENAI_API_KEY="your-openai-api-key-here"  <-- REPLACE with your real key
NEXTAUTH_URL="http://localhost:3000"
```

## PWA Icons (optional)
Replace the empty placeholder files with real PNG icons:
- `public/icons/icon-192.png` (192x192)
- `public/icons/icon-512.png` (512x512)
