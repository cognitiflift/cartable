## Agent skills

### Issue tracker

Les issues et specs vivent dans les GitHub Issues de cognitiflift/cartable (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Labels par défaut : needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `CONTEXT.md` et `docs/adr/` à la racine. See `docs/agents/domain.md`.

## Fondement scientifique

Toute spec, tout ticket et toute ADR qui prend une décision d'apprentissage (quiz, mémoire, progression, récompenses, consignes du prof) ou d'ergonomie (interface, lecture, accessibilité) donne, pour chaque décision :

1. le cadre invoqué : auteurs, année, nom de l'effet ou de la norme ;
2. sa solidité : méta-analyse ou consensus, étude isolée, ou heuristique tirée d'un cadre ;
3. sinon, « aucun cadre, hypothèse à mesurer », plutôt qu'une justification inventée.

Un tableau décision / cadre / solidité suffit. Les cadres déjà utilisés sont dans `docs/cadres-scientifiques.md` : s'y référer, y ajouter tout nouveau cadre avec une référence vérifiée, et inscrire dans sa rubrique « Décisions sans fondement écrit » celles qui n'en ont pas. Une référence dont on doute ne s'écrit pas.

## Style de l'appli

`DESIGN.md` (avec `.impeccable/design.json`) est la source de vérité du style. Le lire avant de toucher l'interface.

- Jetons uniquement : couleurs par `var(--…)` des `:root` clair et sombre de `public/style.css`, polices par `var(--police)` ou `var(--police-titre)`. Une nouvelle couleur se crée en jeton, dans DESIGN.md et dans les deux `:root`.
- Reprendre les composants de DESIGN.md : la ligne, les stations, les cartouches, les tampons de jour, les cartes et les boutons.
- `station`, `ligneLecon`, `carteLecon` et `ligneBadge` (`public/app.js`) sont les seules façons de dessiner une ligne ou ses stations.
- `test/style.test.js` fait échouer `npm test` sur toute couleur ou police hors des jetons, et sur tout désaccord entre DESIGN.md et les jetons. Ses exceptions listent les écarts hérités : on en retire, on n'en ajoute pas.
