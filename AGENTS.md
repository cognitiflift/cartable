## Agent skills

### Issue tracker

Les issues et specs vivent dans les GitHub Issues de cognitiflift/cartable (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Labels par défaut : needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `CONTEXT.md` et `docs/adr/` à la racine. See `docs/agents/domain.md`.

## Style de l'appli

`DESIGN.md` (avec `.impeccable/design.json`) est la source de vérité du style. Le lire avant de toucher l'interface.

- Jetons uniquement : couleurs par `var(--…)` des `:root` clair et sombre de `public/style.css`, polices par `var(--police)` ou `var(--police-titre)`. Une nouvelle couleur se crée en jeton, dans DESIGN.md et dans les deux `:root`.
- Reprendre les composants de DESIGN.md : la ligne, les stations, les cartouches, les tampons de jour, les cartes et les boutons.
- `station`, `ligneLecon` et `carteLecon` (`public/app.js`) sont les seules façons de dessiner une ligne ou ses stations.
- `test/style.test.js` fait échouer `npm test` sur toute couleur ou police hors des jetons, et sur tout désaccord entre DESIGN.md et les jetons. Ses exceptions listent les écarts hérités : on en retire, on n'en ajoute pas.
