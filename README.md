# BTP ERP

Application ERP simple pour chantier, construite avec `React`, `Vite`, `Supabase` et prete pour `Vercel`.

## Scripts

```bash
pnpm install
pnpm dev
pnpm supabase:types
pnpm typecheck
pnpm build
```

## Variables d'environnement

Creer un fichier `.env` a partir de `.env.example` :

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Structure

- `src/pages` : ecrans metier
- `src/lib/erp.ts` : couche metier Supabase centralisee
- `src/components` : layout et composants simples
- `public` : assets statiques

## Deploiement Vercel

- Framework preset : `Vite`
- Root directory : `/`
- Variables a definir : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Modules standards Vercel actifs : `@vercel/analytics`, `@vercel/speed-insights`

## Standardisation Supabase

- Les types Supabase sont generes dans `src/lib/database.types.ts`
- Pour les regenerer depuis le projet lie : `pnpm supabase:types`
