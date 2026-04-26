---
description: Automatiser la génération des messages de commit lors des commits & sync
---

# Workflow pour Commit & Sync avec Message Automatique

Ce workflow automatise la génération des messages de commit lorsque vous effectuez un commit & sync.

## Étapes

1. **Analyser les changements en cours**
   ```bash
   git status
   git diff --cached
   git log --oneline -5
   ```

2. **Générer automatiquement le message de commit**
   - Analyse les fichiers modifiés
   - Détecte le type de changements (feat, fix, docs, style, refactor, test, chore)
   - Génère un message structuré selon les conventions du projet

3. **Format du message généré**
   ```
   [type]: description concise
   
   Détails:
   - Fichiers modifiés: [liste]
   - Impact: [description]
   - Tests: [statut]
   ```

4. **Types de changements détectés**
   - **feat**: Nouvelle fonctionnalité
   - **fix**: Correction de bug
   - **docs**: Documentation
   - **style**: Formatage/style
   - **refactor**: Refactorisation
   - **test**: Tests
   - **chore**: Maintenance/mise à jour

5. **Exécuter le commit & sync**
   ```bash
   git commit -m "[message généré]"
   git push
   ```

## Utilisation

Exécutez ce workflow avant chaque commit & sync pour générer automatiquement un message de commit pertinent et structuré.

## Personnalisation

Vous pouvez adapter les templates de messages dans la section 3 pour correspondre aux conventions spécifiques de votre projet ERP.
