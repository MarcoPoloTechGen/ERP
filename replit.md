# BTP Manager ERP

## Overview

ERP simple pour petite entreprise BTP (Batiment et Travaux Publics). Application full-stack avec React frontend et Express API.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (amber construction theme)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (Replit built-in)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Routing**: Wouter
- **Forms**: react-hook-form
- **Build**: esbuild (CJS bundle)

## Modules

- **Tableau de bord** — resume financier, stats globales
- **Travailleurs** — gestion des employes avec debit/credit (solde)
- **Chantiers** — gestion des projets BTP
- **Fournisseurs** — annuaire fournisseurs
- **Produits/Materiaux** — catalogue produits avec prix
- **Factures** — enregistrement factures payees et impayees

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- Frontend: `artifacts/btp-erp/` — React+Vite app at `/`
- Backend: `artifacts/api-server/` — Express API at `/api`
- DB Schema: `lib/db/src/schema/` — workers, projects, suppliers, products, invoices
- API Spec: `lib/api-spec/openapi.yaml`
- Generated hooks: `lib/api-client-react/src/generated/`
- Generated validators: `lib/api-zod/src/generated/`

## Notes

- After codegen, `lib/api-zod/src/index.ts` is automatically fixed to avoid duplicate exports
- All UI labels are in French
- Theme: amber/construction colors with dark navy sidebar
