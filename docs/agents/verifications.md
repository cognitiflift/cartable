# Vérifications

| Commande | Ce qu'elle fait | Durée |
|---|---|---|
| `npm run check` | `node --check` sur tout le JavaScript | ~1 s |
| `node --test test/<fichier>.test.js` | un fichier de test | selon le fichier |
| `node --test --test-name-pattern="<nom>" test/<fichier>.test.js` | un seul test | selon le test |
| `npm test` | toute la suite | ~45 s au repos, plus si des sous-agents tournent en parallèle |

- Le hook `.githooks/pre-commit` lance `check` et `test/style.test.js`. Activation, une fois par clone : `npm run hooks`.
- La CI (`.github/workflows/ci.yml`) lance `check` puis `npm test` sur chaque PR et sur `main`.
- En worktree, des commandes courtes et séparées passent ; les chaînes `cd … && … | …` sont refusées par le harnais. Les fichiers temporaires vont dans `$CLAUDE_JOB_DIR/tmp`.
