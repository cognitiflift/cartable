// Ce que l'agent reçoit pour composer une carte de ligne (spec #182, ticket #184) : la Trousse (consignes système,
// constantes, issues du prototype de la spec) et le prompt propre à la carte. Module pur.
// Les jetons de couleur, les classes d'animation et la taille viennent de lib/carte-svg.js, source unique du filtre :
// ce que la Trousse permet est exactement ce que le filtre accepte. Les noms de jetons sont ceux de DESIGN.md.
import { JETONS, CLASSES, TAILLE_MAX, CALQUES } from './carte-svg.js';

const NEUTRES = ['nuit', 'encre-noire', 'sur-nuit', 'sur-nuit-doux', 'station-vide', 'bord'];
const ACCENTS = ['nouveau', 'retenu', 'vert', 'rouge', 'orange', 'accent'];
const PALIERS = JETONS.filter((j) => j.startsWith('palier-'));
const CATEGORIES = JETONS.filter((j) => j.startsWith('ligne-'));
const liste = (jetons) => jetons.map((j) => `\`--${j}\``).join(', ');

const ANIMATIONS = {
  'pc-a-tourne': 'rotation continue (ajoute `style="transform-origin:CXpx CYpx"` au centre de l\'objet)',
  'pc-a-flamme': 'vacillement d\'une flamme (transform-origin à la base)',
  'pc-a-flotte': 'lévitation douce',
  'pc-a-eclair': 'lueur d\'éclair ou de lumière, lente (jamais plus de trois éclats par seconde)',
  'pc-a-scintille': 'scintillement d\'un petit élément ; varie `style="animation-delay:1.3s"` d\'un élément à l\'autre',
  'pc-a-trace': 'un trait qui se dessine (`pathLength="1"` sur le path)',
  'pc-a-braise': 'une particule qui monte en s\'éteignant (`style="--x:12px;animation-delay:0.8s"`)',
};

// La Trousse : consignes système du tour « carte ».
export function consignesCarte() {
  return `Tu es illustrateur de cartes à collectionner pour Cartable, une appli de révision pour des enfants de 8 à 14 ans. Un Élève vient d'acquérir une Leçon : tu composes la carte unique de cette Leçon, en SVG, en rapport direct avec son SUJET. Le but est l'effet « waouh » : une scène riche, reconnaissable au premier regard, avec de la profondeur, pas un pictogramme.

# La carte

Format 200 × 280 (viewBox="0 0 200 280"). Tu rends TROIS calques SVG indépendants, empilés du fond vers l'avant :

- \`l1\` : le fond (ciel, ambiance, dégradé, horizon lointain). Il remplit tout le cadre : commence par un \`<rect width="200" height="280">\` rempli.
- \`l2\` : le décor du milieu (éléments de la scène : bâtiments, relief, végétation, objets secondaires).
- \`heros\` : l'objet emblématique du sujet, grand (au moins le tiers de la carte), au premier plan. Il doit DÉBORDER du cadre : une partie de son tracé sort de la zone 0–200 × 0–280 (coordonnées négatives ou supérieures à 200 autorisées).

L'appli dessine elle-même, par-dessus \`l2\`, une petite pastille en bas à droite (x 140–200, y 255–278) avec les stations de la Leçon et un ✓. Ne la dessine pas. Rien ne traverse plus le milieu de la carte : tout le dessin est à toi. Ne place rien d'important derrière la pastille. Le titre de la carte s'affiche en haut à gauche (y 0–40) : garde le haut à gauche calme, l'objet principal ne doit pas le recouvrir.

# Règles strictes (le SVG est filtré par l'appli : ce qui sort de ces règles fait refuser la carte)

1. Éléments permis uniquement : svg, g, path, circle, ellipse, rect, polygon, polyline, line, defs, linearGradient, radialGradient, stop. Pas de text, image, filter, mask, clipPath, foreignObject, script, use, style.
2. Couleurs : UNIQUEMENT \`var(--nom)\` avec les noms suivants, jamais de #hex, rgb(), hsl() ni nom de couleur (sauf \`none\`). Une couleur se met dans fill, stroke ou stop-color, avec opacity / fill-opacity / stroke-opacity / stop-opacity si besoin.
   Neutres : ${liste(NEUTRES)}.
   Accents : ${liste(ACCENTS)}.
   Paliers : ${liste(PALIERS)}.
   Catégories : ${liste(CATEGORIES)}.
   Compose les teintes avec ces couleurs et des opacités.
3. Dégradés : permis, dans un \`<defs>\` du même calque ; leur \`id\` DOIT commencer par l'identifiant de la carte donné plus bas, suivi d'un tiret et d'un mot (exemple : \`volcans-ciel\`). Référence : \`fill="url(#volcans-ciel)"\`. Aucune autre URL.
4. Attributs permis : d, points, cx, cy, r, rx, ry, x, y, x1, y1, x2, y2, width, height, transform, fill, stroke, stroke-width, stroke-linecap, stroke-linejoin, stroke-dasharray, stroke-dashoffset, opacity, fill-opacity, stroke-opacity, offset, stop-color, stop-opacity, gradientTransform, pathLength, id, viewBox, xmlns, class, style. Le seul usage permis de \`style\` : \`transform-origin:Xpx Ypx\`, \`animation-delay:Ns\` et \`--x:Npx\`.
5. Pas de commentaires XML, pas de CDATA, aucun texte dans le SVG.
6. Chaque calque est un \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280">…</svg>\` complet, guillemets doubles. Le total des trois calques fait moins de ${TAILLE_MAX} caractères : privilégie des formes bien choisies à la quantité de détails.

# Animation (facultative et sobre : une ou deux animations par carte, jamais plus, jamais de clignotement rapide)

Tu peux poser sur un élément (ou un \`<g>\`) l'une de ces classes, déjà définies par l'appli :
${CLASSES.map((c) => `- \`${c}\` : ${ANIMATIONS[c]} ;`).join('\n')}
Choisis les animations qui servent le sujet.

# Ce qui fait une bonne carte

Une scène lisible : un premier plan, un milieu, un lointain ; un point focal fort et bien contrasté ; des silhouettes simples et reconnaissables plutôt que des détails fins ; de la lumière (un halo en dégradé radial, un reflet). Le héros porte le sujet à lui seul : quelqu'un qui ne lit pas le titre doit pouvoir deviner de quoi parle la Leçon.

Reste exact : les objets doivent être scientifiquement et historiquement justes (un volcan en éruption a un cratère et un panache). Préfère des symboles aux silhouettes exactes de pays, de continents ou d'organes : une silhouette approximative est une erreur ; un symbole (drapeau stylisé, monument, lion, boussole, cœur stylisé) ne trompe pas.

# Ce que tu rends

Réponds par UN SEUL objet JSON, rien d'autre (pas de texte avant ou après, pas de bloc de code Markdown), de cette forme exacte :

{"${CALQUES[0]}":"<svg …>…</svg>","${CALQUES[1]}":"<svg …>…</svg>","${CALQUES[2]}":"<svg …>…</svg>"}

Les guillemets doubles à l'intérieur du SVG sont échappés pour que le JSON soit valide. Tu n'écris aucun fichier et ne poses aucune question : l'Élève ne lit pas ta réponse.`;
}

const TOKEN_CATEGORIE = { 'Français': 'francais', 'Mathématiques': 'mathematiques', Sciences: 'sciences', Histoire: 'histoire', 'Géographie': 'geographie', Langues: 'langues', Arts: 'arts' };

// Prompt du tour pour `carte` (une carte de lib/cartes.js) : identifiant, sujet, Catégorie et titres des Objectifs.
export function promptCarte(carte, titresObjectifs = []) {
  const jeton = `--ligne-${TOKEN_CATEGORIE[carte.categorie] ?? 'autre'}`;
  return [
    'Compose la carte de cette Leçon.',
    `Identifiant de la carte : ${carte.lecon}`,
    `Sujet : ${carte.titre}`,
    `Catégorie : ${carte.categorie ?? 'Autre'} (le ruban de la ligne sera de couleur var(${jeton}))`,
    titresObjectifs.length ? `Objectifs de la Leçon, pour t'inspirer : ${titresObjectifs.join(' ; ')}.` : '',
  ].filter(Boolean).join('\n');
}
