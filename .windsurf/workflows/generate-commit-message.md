---
description: Générer automatiquement un message de commit basé sur les changements
---

# Générer un Message de Commit Automatique

Ce script analyse les changements en cours et génère un message de commit structuré.

## Étapes

1. **Analyser l'état git**
   // turbo
   ```bash
   git status --porcelain
   ```

2. **Obtenir les différences**
   // turbo
   ```bash
   git diff --cached --name-only
   git diff --cached --stat
   ```

3. **Analyser les fichiers modifiés**
   // turbo
   ```bash
   git diff --cached --unified=3 | head -50
   ```

4. **Générer le message de commit**
   Basé sur l'analyse des changements, le message sera généré avec le format:
   ```
   [type]: description
   
   Changements:
   - fichiers: [liste]
   - impact: [description]
   ```

5. **Appliquer le commit**
   ```bash
   git commit -m "[message généré]"
   git push
   ```

## Types détectés automatiquement

- **feat**: Nouveaux composants, fonctionnalités
- **fix**: Corrections de bugs, erreurs
- **docs**: Documentation, README
- **style**: CSS, formatage
- **refactor**: Réorganisation code
- **test**: Tests unitaires, intégration
- **chore**: Dépendances, configuration
