# Configuration des Notifications d'Erreur par Email

Ce système envoie automatiquement un email au super admin lors d'erreurs critiques dans l'application.

## Architecture

```
Application Frontend
       ↓ (erreur critique)
  error-handler.ts
       ↓
supabase.error_notifications (table)
       ↓ (trigger)
send-error-notification (Edge Function)
       ↓
   Resend API
       ↓
  Super Admin Email
```

## Configuration Rapide (Sans CLI)

### 1. Appliquer la migration (SQL Editor)

1. Allez sur le **Supabase Dashboard** → **SQL Editor**
2. Ouvrez le fichier `supabase/migrations/MANUAL_DEPLOY.sql`
3. Copiez tout le contenu
4. Collez dans le SQL Editor
5. Cliquez sur **Run**

### 2. Déployer la Edge Function

1. Allez sur **Supabase Dashboard** → **Edge Functions**
2. Cliquez sur **New Function**
3. Nom: `send-error-notification`
4. Copiez le contenu de `supabase/functions/send-error-notification/index.ts`
5. Cliquez sur **Deploy**

### 3. Configurer les secrets

1. Allez sur **Project Settings** → **Edge Functions**
2. Ajoutez ces secrets:
   - `RESEND_API_KEY` = `re_xxxxxxxxxxxxxxxxxxxxxxxx` (votre clé API Resend)
   - `FROM_EMAIL` = `noreply@votredomaine.com`

### 4. Configurer l'email du super admin

1. Allez dans votre application → **Page Admin**
2. Section **"Notifications d'erreur"** (visible uniquement pour super admin)
3. Entrez l'email du super admin
4. Cliquez sur **Sauvegarder**

---

## Configuration via CLI (si disponible)

### 1. Appliquer la migration

```bash
supabase db push
```

Ou exécuter manuellement le fichier `supabase/migrations/20260427230000_add_error_notifications.sql`

### 2. Déployer la Edge Function

```bash
supabase functions deploy send-error-notification
```

### 3. Configurer les secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set FROM_EMAIL=noreply@votredomaine.com
```

### 4. Configurer l'email du super admin

**Option A** : Via l'interface Admin (page Admin.tsx)

**Option B** : Directement en base de données

```sql
UPDATE notification_settings
SET super_admin_email = 'admin@votredomaine.com'
WHERE id = 1;
```

### 5. Tester

**Via l'interface:**
1. Allez dans l'application
2. Déclenchez une erreur serveur (couper temporairement la connexion réseau)
3. Vérifiez que l'email est reçu

**Via SQL (test manuel):**
```sql
-- Test: Insérer une erreur de test
INSERT INTO public.error_notifications (
    error_type,
    error_message,
    error_details,
    user_email,
    page_url
) VALUES (
    'server',
    'Test error from SQL',
    '{"test": true, "source": "manual_test"}',
    'test@example.com',
    'https://yourapp.com/test'
);

-- Vérifier que l'erreur est enregistrée
SELECT * FROM public.error_notifications
ORDER BY created_at DESC
LIMIT 5;
```

## Types d'erreurs notifiées

Par défaut, seules les erreurs critiques déclenchent un email :

- `server` : Erreurs 5xx du serveur
- `auth` : Erreurs d'authentification (401)
- `permission` : Erreurs de permission (403)

Pour modifier ce comportement :

```sql
UPDATE notification_settings
SET notify_on_critical_only = false; -- Notifier pour toutes les erreurs
```

## Désactiver les notifications

```sql
UPDATE notification_settings
SET notify_on_error = false;
```

## Personnalisation du template email

Modifier le fichier `supabase/functions/send-error-notification/index.ts` :

```typescript
function buildEmailHtml(error: any): string {
  // Votre template HTML personnalisé
}
```

## Monitoring

Voir les erreurs enregistrées :

```sql
SELECT * FROM error_notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

Voir les emails envoyés :

```sql
SELECT * FROM error_notifications
WHERE email_sent = true
ORDER BY email_sent_at DESC;
```
