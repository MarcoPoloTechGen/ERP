# Correction Installation Supabase CLI

## Problème
L'installation via `npm install -g supabase` n'est plus supportée (erreur: "Installing Supabase CLI as a global module is not supported").

## Solutions Correctes

### Option 1: Téléchargement Direct (Recommandé Windows)
1. **Téléchargez le binaire Windows**:
   - Allez sur: https://github.com/supabase/cli/releases
   - Téléchargez: `supabase_windows_amd64.exe`
2. **Renommez le fichier** en `supabase.exe`
3. **Ajoutez au PATH**:
   - Placez `supabase.exe` dans un dossier (ex: `C:\Tools\supabase`)
   - Ajoutez ce dossier au PATH Windows
4. **Redémarrez le terminal** et testez:
   ```bash
   supabase --version
   ```

### Option 2: Via Scoop (Si installé)
```bash
scoop install supabase
```

### Option 3: Via Chocolatey (Si installé)
```bash
choco install supabase
```

### Option 4: Via Winget (Windows 10/11)
```bash
winget install Supabase.CLI
```

### Option 5: Via npm local (Alternative)
```bash
# Dans votre projet
npm install supabase
npx supabase db push
```

## Étapes après Installation

### 1. Connexion
```bash
supabase login
```

### 2. Appliquer la Migration
```bash
# Dans votre dossier ERP
supabase db push
```

## Alternative: Dashboard Supabase (Plus Simple)

Si vous avez un compte Supabase:

1. **Allez sur**: https://app.supabase.com
2. **Connectez-vous** à votre projet
3. **Allez dans**: SQL Editor
4. **Créez une nouvelle requête**
5. **Copiez-collez** le contenu de:
   - `supabase/migrations/202604270000_cleanup_and_optimize.sql`
6. **Exécutez** la requête
7. **Répétez** avec le fichier de validation

## Vérification

Après l'installation, testez:
```bash
supabase --version
supabase projects list
```

## Prochaines Étapes

1. **Installez Supabase CLI** avec une des méthodes ci-dessus
2. **Connectez-vous** à votre compte
3. **Appliquez la migration** avec `supabase db push`
4. **Validez** avec le script de validation

---

**Recommandation**: Utilisez l'Option 1 (téléchargement direct) pour Windows, c'est la plus fiable.
