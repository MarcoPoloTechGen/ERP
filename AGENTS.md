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
- Keep translations consistent across the UI, forms, validation messages, and empty states.

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
