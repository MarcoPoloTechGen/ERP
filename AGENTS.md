# ERP Project Instructions

## Project Context

- This application is already in production.
- Prefer small, targeted, low-risk changes over broad refactors.
- Preserve current behavior unless the user explicitly asks for a behavior change.
- Read the relevant files before editing them.

## Code And Naming

- Write code, identifiers, file names, and technical comments in English.
- Keep implementations clear and maintainable.
- Avoid unnecessary rewrites of working code.

## User Language And Translations

- Kurdish should be the default language for the application.
- Assume most end users will use Kurdish.
- Any new or changed user-facing text must be properly translated to Kurdish.
- Do not leave new UI text only in English if it is visible to end users.
- Keep translations consistent across the UI, forms, validation messages, empty states, and exports.
- UI copy must stay English or Kurdish only. Do not add French text to the product UI.

## Production Data Safety

- Treat the SQL database and Supabase data as production data at all times.
- Never overwrite, delete, reset, reseed, truncate, or mass-update data unless the user explicitly asks for it.
- Never run destructive SQL such as `DROP`, `TRUNCATE`, broad `DELETE`, or broad `UPDATE` without explicit confirmation.
- Double-check filters, joins, and `WHERE` clauses before changing queries or mutations.
- Prefer additive and backward-compatible database changes.
- If a migration is required, make it as safe, targeted, and idempotent as possible.
- Avoid changes that could accidentally modify existing customer, project, invoice, or operational data.

## Database And Schema Changes

- Do not change the production schema unless it is necessary for the task.
- Prefer non-breaking migrations over destructive schema edits.
- If a schema or data migration has meaningful risk, pause and surface the risk before proceeding.
- Avoid assumptions about existing data quality or completeness.

## Working Style

- Explain planned edits briefly before making substantial changes.
- After making changes, run the relevant checks or tests when possible.
- Call out assumptions, risks, and any unverified areas in the final handoff.

## System Inventory

- Product name: `BTP Manager`
- Repository type: single-page frontend application with direct Supabase access
- Production state: already live in production
- Main deployment target: Vercel
- Main runtime stack:
  - `react` `19.1.0`
  - `react-dom` `19.1.0`
  - `typescript` `5.9.x`
  - `vite` `7.3.2`
  - `@tanstack/react-query` `5.90.21`
  - `@supabase/supabase-js` `2.49.4`
  - `wouter` `3.3.5`
  - `react-hook-form` `7.71.2`
  - `tailwindcss` `4.2.1`
  - `xlsx` `0.18.5`
- Observability:
  - `@vercel/analytics`
  - `@vercel/speed-insights`
- This repo does not contain a custom API server. The browser talks directly to Supabase using the public anon key.

## Runtime Defaults

- Default app language: Kurdish (`ku`)
- Secondary language: English (`en`)
- Language storage key: `btp-lang`
- HTML language is set to `ckb` for Kurdish and `en` for English.
- Kurdish UI runs in `rtl`. English UI runs in `ltr`.
- React Query defaults:
  - query `staleTime`: `30000`
  - query `retry`: `1`
  - query `refetchOnWindowFocus`: `false`
  - mutation `retry`: `0`
- Pagination defaults in the ERP data layer:
  - default page size: `10`
  - maximum page size: `50`
- Supported roles: `admin`, `user`
- Supported project statuses: `active`, `completed`, `paused`
- Supported invoice statuses: `unpaid`, `partial`, `paid`
- Supported worker transaction types: `credit`, `debit`
- Supported currencies: `USD`, `IQD`

## Environment And Deployment Configuration

- Required environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Optional runtime environment variables:
  - `BASE_PATH` for non-root deployments
  - `PORT` for local dev and preview
- Do not store real secrets in the repo. Keep actual values in local `.env` files and in Vercel project settings.
- Vite configuration:
  - root: repo root
  - output directory: `dist`
  - dev host: `0.0.0.0`
  - dev port default: `5173`
  - preview port default: `4173`
  - alias: `@` -> `src`
- Vercel configuration rewrites all routes to `/index.html` so SPA routes work in production.
- The app registers `public/sw.js` on page load.
- PWA metadata lives in `public/manifest.webmanifest`.
- Static brand assets live in `public/`.

## Application Routes

- `/` -> dashboard
- `/workers` -> workers list
- `/workers/:id` -> worker detail and transactions
- `/projects` -> projects list and project editor
- `/projects/:id` -> project detail
- `/suppliers` -> suppliers list
- `/products` -> products and materials list
- `/income` -> income entries
- `/expenses` -> expenses list
- `/expenses/:id` -> expense detail and history
- `/admin` -> roles, memberships, branding
- `/reset-password` -> Supabase password recovery flow
- Unauthenticated users are sent to the auth screen.

## Important Source Files

- Frontend entry: `src/main.tsx`
- App shell and routes: `src/App.tsx`
- Layout and language switcher: `src/components/Layout.tsx`
- Supabase client and storage helpers: `src/lib/supabase.ts`
- Auth session flow: `src/lib/auth.tsx`
- Translation catalog and default language: `src/lib/i18n.tsx`
- Main ERP data layer: `src/lib/erp.ts`
- Database types generated from Supabase: `src/lib/database.types.ts`
- Current Supabase schema snapshot: `supabase/schema.sql`
- Historical Supabase migrations: `supabase/migrations/*.sql`
- Remote schema repair script: `supabase/repair_remote_schema.sql`

## Package Scripts

- `pnpm dev` -> start Vite dev server
- `pnpm build` -> production build
- `pnpm serve` -> preview built output
- `pnpm typecheck` -> TypeScript check without emit
- `pnpm lint` -> ESLint
- `pnpm test` -> Vitest run
- `pnpm test:watch` -> Vitest watch mode
- `pnpm check` -> lint + typecheck + test
- `pnpm supabase:types` -> regenerate `src/lib/database.types.ts` from the linked Supabase project

## Supabase Project Configuration

- Linked Supabase project ref: `esavwsnziwdcresafbgv`
- Types generation command:
  - `pnpm dlx supabase gen types typescript --project-id esavwsnziwdcresafbgv --schema public > src/lib/database.types.ts`
- Supabase is used for:
  - authentication
  - relational database
  - row-level security
  - storage buckets for invoice images and branding

## Supabase Auth Model

- Authentication is handled with Supabase Auth from the browser.
- Supported auth flows in the app:
  - sign in with email and password
  - sign up with email and password
  - password reset email
  - password update from recovery link
- New sign-ups send `full_name` in user metadata.
- The database trigger `handle_new_user()` creates or updates `public.profiles`.
- The first profile ever created becomes `admin`. Later users default to `user`.
- Password reset redirects back to `/reset-password`.
- Auth bootstrap timeout in the UI is `8000ms` with a final guard after `16000ms`.

## Supabase Storage Buckets

- `invoice-images`
  - private bucket
  - used for uploaded expense or invoice images
  - files are uploaded under paths like `project-{id}/{year}/timestamp-number.ext` or `shared/{year}/...`
  - the app creates signed URLs for viewing
- `branding-assets`
  - public bucket
  - used for the company logo
  - the app stores the selected logo path in `public.app_settings`
- Storage access is controlled by RLS policies on `storage.objects`.

## Supabase Tables

- `public.profiles`
  - one row per `auth.users` record
  - columns: `id`, `email`, `full_name`, `role`, `created_at`
  - relation: `profiles.id` -> `auth.users.id`
- `public.app_settings`
  - single logical settings row with `id = 'default'`
  - stores `company_logo_path`, `updated_by`, `updated_at`
  - relation: `updated_by` -> `profiles.id`
- `public.workers`
  - worker directory
  - includes computed `balance`
- `public.suppliers`
  - supplier directory
- `public.projects`
  - project master table
  - dates and non-negative budget are validated in SQL
- `public.project_buildings`
  - buildings per project
  - relation: `project_id` -> `projects.id`
- `public.products`
  - products or materials
  - relations:
    - `supplier_id` -> `suppliers.id`
    - `project_id` -> `projects.id`
    - `building_id` -> `project_buildings.id`
- `public.invoices`
  - expense or invoice records
  - relations:
    - `supplier_id` -> `suppliers.id`
    - `project_id` -> `projects.id`
    - `building_id` -> `project_buildings.id`
    - `product_id` -> `products.id`
    - `created_by` -> `profiles.id`
  - constraints:
    - `number` is unique
    - `paid_amount <= total_amount`
    - `due_date >= invoice_date`
- `public.worker_transactions`
  - money movements for workers
  - relations:
    - `worker_id` -> `workers.id`
    - `project_id` -> `projects.id`
- `public.project_memberships`
  - project access mapping for non-admin users
  - relations:
    - `project_id` -> `projects.id`
    - `user_id` -> `profiles.id`
  - unique pair: `(project_id, user_id)`
- `public.income_transactions`
  - income records
  - relations:
    - `project_id` -> `projects.id`
    - `created_by` -> `profiles.id`
- `public.invoice_history`
  - snapshot history for invoice changes
  - relations:
    - `invoice_id` -> `invoices.id`
    - `supplier_id` -> `suppliers.id`
    - `project_id` -> `projects.id`
    - `building_id` -> `project_buildings.id`
    - `product_id` -> `products.id`
    - `changed_by` -> `profiles.id`

## Core Supabase Relations

- `auth.users` `1 -> 1` `profiles`
- `profiles` `1 -> many` `project_memberships`
- `profiles` `1 -> many` `invoices` through `created_by`
- `profiles` `1 -> many` `income_transactions` through `created_by`
- `profiles` `1 -> many` `invoice_history` through `changed_by`
- `profiles` `1 -> many` `app_settings` updates through `updated_by`
- `projects` `1 -> many` `project_buildings`
- `projects` `1 -> many` `products`
- `projects` `1 -> many` `invoices`
- `projects` `1 -> many` `income_transactions`
- `projects` `1 -> many` `worker_transactions`
- `projects` `1 -> many` `project_memberships`
- `suppliers` `1 -> many` `products`
- `suppliers` `1 -> many` `invoices`
- `project_buildings` `1 -> many` `products`
- `project_buildings` `1 -> many` `invoices`
- `products` `1 -> many` `invoices`
- `workers` `1 -> many` `worker_transactions`
- `invoices` `1 -> many` `invoice_history`

## Supabase Views Used By The Frontend

- `public.app_projects`
  - projects enriched with `building_count`
- `public.app_products`
  - products enriched with supplier, project, and building names
- `public.app_worker_transactions`
  - worker transactions enriched with `project_name`
- `public.app_income_transactions`
  - income entries enriched with `project_name` and `created_by_name`
- `public.app_invoices`
  - invoices enriched with supplier, project, building, product, creator names, and `remaining_amount`
- `public.app_invoice_history`
  - history snapshots enriched with `remaining_amount`

## Supabase Functions And Triggers

- `handle_new_user()`
  - syncs a new auth user into `profiles`
  - grants the first account the `admin` role
- `current_user_role()`
  - returns the current role from `profiles`
- `is_admin()`
  - returns whether the authenticated user is an admin
- `can_access_project(target_project_id)`
  - returns whether the current user can access a project
- `can_access_invoice_object(object_name)`
  - validates access to invoice image storage paths
- `sync_worker_balance()`
  - recalculates `workers.balance` from `worker_transactions`
- `replace_project_buildings(project_id, building_names[])`
  - replaces the entire building list for a project
- `save_project_with_buildings(...)`
  - creates or updates a project and then calls `replace_project_buildings`
- `replace_user_project_memberships(user_id, project_ids[])`
  - rewrites project memberships for a user
- `get_dashboard_overview()`
  - returns dashboard totals and summaries as JSON
- `log_invoice_history()`
  - writes a history snapshot after invoice insert or update
- Trigger `trg_log_invoice_history`
  - runs `log_invoice_history()` after insert or update on `public.invoices`

## Row-Level Security Summary

- `profiles`
  - authenticated users can read profiles
  - users can update their own profile without changing their role
  - admins can update any profile
- `app_settings`
  - readable by `anon` and `authenticated`
  - writable only by admins
- `workers`
  - all authenticated users currently have full access
- `suppliers`
  - all authenticated users currently have full access
- `projects`
  - readable only if the user is admin or a member of the project
  - writable only by admins
- `project_buildings`
  - readable only through project access
  - writable only by admins who can access the project
- `products`
  - access is scoped by `can_access_project(project_id)`
  - rows with `project_id = null` are effectively global to authenticated users
- `invoices`
  - access is scoped by `can_access_project(project_id)`
  - rows with `project_id = null` are effectively global to authenticated users
- `income_transactions`
  - scoped by project access
- `project_memberships`
  - admin-only access
- `invoice_history`
  - readable and insertable only when the related project is accessible
- `invoice-images` storage objects
  - authenticated access only
  - storage path is checked through `can_access_invoice_object(name)`
- `branding-assets` storage objects
  - admin write only

## Frontend To Supabase Mapping

- Auth screens:
  - `supabase.auth`
  - `profiles`
  - `app_settings`
- Dashboard:
  - RPC `get_dashboard_overview()`
- Workers pages:
  - `workers`
  - `app_worker_transactions`
  - `worker_transactions`
  - `projects`
- Projects pages:
  - `app_projects`
  - `project_buildings`
  - RPC `save_project_with_buildings(...)`
- Suppliers pages:
  - `suppliers`
- Products pages:
  - `app_products`
  - `products`
  - `projects`
  - `project_buildings`
  - `suppliers`
- Income page:
  - `app_income_transactions`
  - `income_transactions`
  - `projects`
- Expenses pages:
  - `app_invoices`
  - `invoices`
  - `app_invoice_history`
  - storage bucket `invoice-images`
  - `projects`
  - `project_buildings`
  - `suppliers`
  - `products`
- Admin page:
  - `profiles`
  - `project_memberships`
  - `app_projects`
  - `app_settings`
  - storage bucket `branding-assets`

## Recreation Checklist

- Install dependencies with `pnpm install`.
- Create local `.env` from `.env.example`.
- Provide valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- If rebuilding Supabase from scratch:
  - create a new Supabase project
  - apply `supabase/schema.sql` to reproduce the current schema, buckets, policies, functions, triggers, and grants
  - review and apply targeted migration files from `supabase/migrations/` if historical parity is needed
  - regenerate `src/lib/database.types.ts`
- Start the app with `pnpm dev`.
- Validate with:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- Configure the same environment variables in Vercel for preview and production.
- Ensure Vercel uses the repo root as the project root and the Vite preset.

## Critical Production Risks

- `save_project_with_buildings()` calls `replace_project_buildings()`, which deletes all existing building rows for that project before reinserting names.
- Because `products.building_id`, `invoices.building_id`, and `invoice_history.building_id` use `on delete set null`, editing project buildings can silently detach existing records from their buildings.
- Do not change project buildings on production data without explicitly checking downstream invoice and product impact.
- Deleting workers, suppliers, products, projects, invoices, storage files, or memberships is a real destructive production action.
- The frontend uses the public anon key only. Never introduce a service role key into client-side code.
- Before any schema rewrite, data migration, or cleanup on production, require a backup or a safe rollback plan.
