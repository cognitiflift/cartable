## Agent skills

### Issue tracker

Les issues et specs vivent dans les GitHub Issues de cognitiflift/cartable (CLI `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Labels par défaut : needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context : `CONTEXT.md` et `docs/adr/` à la racine. See `docs/agents/domain.md`.

### Vérifications

Lancer `check`, un seul test ou la suite entière : `docs/agents/verifications.md`.

### Hébergement sur le NAS

Installer et publier Cartable sur le NAS Synology (Docker, jeton Claude, pare-feu, migration, liste de contrôle) : `docs/agents/nas-synology.md`.

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
- Exception : les dessins de calque d'une carte (`gare` et `tampon` de `public/carte-badge-art.js`, scène de `lib/carte-generique.js`) sont du décor, pas des lignes de l'appli : ils peuvent dessiner leurs propres stations, en jetons uniquement.
- `test/style.test.js` fait échouer `npm test` sur toute couleur ou police hors des jetons, et sur tout désaccord entre DESIGN.md et les jetons. Ses exceptions listent les écarts hérités : on en retire, on n'en ajoute pas.

### Commandes impeccable des tickets

Un ticket ou une spec d'interface a une rubrique « Commande impeccable » : l'agent qui le réalise lance lui-même ces commandes, avec l'outil Skill (`impeccable`), sans attendre qu'on le lui demande.

- Dans l'ordre écrit dans la rubrique. Celles qui façonnent (`clarify`, `delight`, `layout`, `harden`…) viennent avant le code ou pendant ; `polish`, puis `critique` sur la cible, viennent en dernier, une fois le code en place.
- Le ticket n'est pas fini tant que ces commandes n'ont pas tourné. Le rapport dit lesquelles ont été lancées et ce qu'elles ont changé ; pour `critique`, le score est comparé à celui du ticket ou de la spec, s'il y en a un.
- Les commandes qui jugent (`critique`, la relecture de fin) sont confiées à un sous-agent neuf, qui n'a pas écrit le code : il reçoit le ticket, `DESIGN.md` et la cible, et ne renvoie que la liste ordonnée des corrections. L'agent du ticket les applique. Les commandes qui modifient (`clarify`, `delight`, `layout`, `harden`, `polish`) restent dans l'agent du ticket. Si cet agent ne peut pas lancer de sous-agent, il lance `critique` lui-même et le note dans son rapport.
- Quand une commande demande de voir l'appli (`live`, `critique`, captures), l'agent la pilote avec un navigateur : l'outil navigateur de la session s'il y en a un (Claude in Chrome ou le navigateur intégré), sinon Chromium en ligne de commande (`chromium --headless`) sur l'appli lancée en local. Les données de test passent par une copie des Élèves (skill `tester-pr`), jamais par les vrais.
- Si aucun navigateur n'est utilisable, ou si une commande demande une décision humaine, l'agent le dit dans son rapport et laisse le ticket ouvert pour cette étape : il ne la saute pas en silence.
