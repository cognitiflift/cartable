import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Style : une couleur en dur dans une règle est signalée, avec quoi faire', () => {
  const ecarts = ecartsDeStyle('.bulle { color: #b8733d; }', []);
  assert.equal(ecarts.length, 1);
  assert.match(ecarts[0], /^\.bulle \{ color \} : couleur en dur #b8733d\./);
  assert.match(ecarts[0], /jeton de DESIGN\.md/);
});

test('Style : rgb(), rgba(), hsl(), oklch() et les couleurs nommées sont aussi des couleurs en dur', () => {
  const css = `.a { box-shadow: 0 6px 24px rgba(0,0,0,.2); border-color: rgb(255 255 255 / .32); }
    .b { background: hsl(120 50% 40%); color: oklch(0.7 0.1 200); outline-color: White; } .c { color: rgb(var(--ombre), 0, 0); }`;
  assert.deepEqual(ecartsDeStyle(css, []).map((e) => e.split('. ')[0]), [
    '.a { box-shadow } : couleur en dur rgba(0,0,0,.2)',
    '.a { border-color } : couleur en dur rgb(255 255 255 / .32)',
    '.b { background } : couleur en dur hsl(120 50% 40%)',
    '.b { color } : couleur en dur oklch(0.7 0.1 200)',
    '.b { outline-color } : couleur en dur White',
    '.c { color } : couleur en dur rgb(var(--ombre), 0, 0)',
  ]);
});

test('Style : les jetons des :root clair et sombre et leurs usages ne sont pas des écarts', () => {
  const css = `:root { --fond:#f2f4f8; --ombre:20 24 43; --nuit: white; }
    @media (prefers-color-scheme: dark) { :root { --fond:#0f1220; } .lecon { color: var(--orange); } }
    .lecon { box-shadow: 0 1px 2px rgb(var(--ombre) / .06); background: color-mix(in srgb, var(--accent) 22%, transparent); }
    .titre { font-family: var(--police-titre); }`;
  assert.deepEqual(ecartsDeStyle(css, []), []);
});

test('Style : une police littérale est signalée ; @font-face et les variables de police ne le sont pas', () => {
  const css = `@font-face { font-family:"Overpass"; src:url(/polices/overpass-latin.woff2) format("woff2"); }
    .a { font-family: "Comic Sans MS", cursive; } .b { font: 800 1rem/1 system-ui; } .c { font-family: var(--police), serif; }
    .d { font: 800 1.35rem/1 var(--police-titre); } button { font: inherit; } .e { font-family: var(--police); }`;
  const ecarts = ecartsDeStyle(css, []);
  assert.deepEqual(ecarts.map((e) => e.split(' »')[0]), [
    '.a { font-family } : police littérale « "Comic Sans MS", cursive',
    '.b { font } : police littérale « 800 1rem/1 system-ui',
    '.c { font-family } : police littérale « var(--police), serif',
  ]);
  assert.match(ecarts[0], /var\(--police\) ou var\(--police-titre\)/);
});

test('Style : un écart listé en exception passe ; une exception qui ne correspond plus à rien échoue', () => {
  const css = '.seance { background: #2e9e5b; color: #fff; }';
  const exceptions = [
    { ecran: 'Séance', lieu: '.seance', propriete: 'background', valeur: '#2e9e5b' },
    { ecran: 'Mes badges', lieu: '.pastille-badge.or', propriete: 'border-color', valeur: '#d4a017' },
  ];
  const ecarts = ecartsDeStyle(css, exceptions);
  assert.equal(ecarts.length, 2);
  assert.match(ecarts[0], /^\.seance \{ color \} : couleur en dur #fff\./);
  assert.equal(ecarts[1], 'Exception périmée (Mes badges) : .pastille-badge.or { border-color: #d4a017 } n\'apparaît plus dans la feuille de style. La retirer de la liste.');
});

test('Style : les couleurs de DESIGN.md sont celles des jetons des :root clair et sombre', () => {
  const design = `---
name: Cartable
colors:
  fond: "#f2f4f8"
  carte: "#ffffff"
  nuit: "#14182b"
  accent: "#2747c9"
  fond-sombre: "#0f1220"
  accent-sombre: "#8aa2ff"
typography:
  body:
    fontFamily: "Atkinson Hyperlegible Next"
---
# Design System`;
  const accord = `:root { --police:"Atkinson"; --fond:#F2F4F8; --carte:#fff; --nuit:#14182b; --accent:#2747c9; --ombre:20 24 43; }
    @media (prefers-color-scheme: dark) { :root { --fond:#0f1220; --nuit:#14182b; --accent:#8aa2ff; } }`;
  assert.deepEqual(ecartsDesign(design, accord), []);

  const desaccord = `:root { --fond:#f2f4f9; --nuit:#14182b; --accent:#2747c9; --rose:#ff00aa; }
    @media (prefers-color-scheme: dark) { :root { --fond:#0f1220; --nuit:#000; } }`;
  assert.deepEqual(ecartsDesign(design, desaccord), [
    'fond : DESIGN.md dit #f2f4f8, le :root clair de public/style.css dit #f2f4f9. Mettre les deux d\'accord.',
    'carte : DESIGN.md dit #ffffff, le :root clair de public/style.css n\'a pas de --carte. Mettre les deux d\'accord.',
    '--rose : le :root clair de public/style.css le définit (#ff00aa), DESIGN.md (colors) ne le nomme pas. Mettre les deux d\'accord.',
    'accent-sombre : DESIGN.md dit #8aa2ff, le :root sombre de public/style.css n\'a pas de --accent. Mettre les deux d\'accord.',
    'nuit : DESIGN.md dit #14182b, le :root sombre de public/style.css dit #000. Mettre les deux d\'accord.',
  ]);
});

// Les écarts de public/style.css aux jetons, hérités des écrans pas encore redessinés (DESIGN.md, « Frontière
// d'extension »). La liste ne peut que rétrécir : quand un écran revient aux jetons, retirer ses lignes ; une
// exception qui ne correspond plus à rien fait échouer le test. N'en ajouter aucune : créer un jeton.
const EXCEPTIONS = [
  ...ecran('Séance', [
    ['.seance-centre.voile', 'background', 'rgba(0,0,0,.45)'],
    ['.bulle-prof', 'box-shadow', 'rgba(0,0,0,.2)'],
    ['.retour', 'box-shadow', 'rgba(0,0,0,.25)'],
    ['.action-suivante, .lecon-terminee', 'background', '#2e9e5b'],
    ['.action-suivante, .lecon-terminee', 'border-color', '#2e9e5b'],
    ['.action-suivante, .lecon-terminee', 'box-shadow', 'rgba(0,0,0,.25)'],
    ['.lecon-terminee', 'background', '#d4a017'],
    ['.lecon-terminee', 'color', '#fff'],
    ['@keyframes pulsation 50%', 'box-shadow', 'rgba(46,158,91,.25)'],
  ]),
  ...ecran('Mes badges : pastilles des Paliers', [
    ['.pastille-badge.bronze', 'border-color', '#b8733d'],
    ['.pastille-badge.bronze', 'background', '#f3e0cf'],
    ['.pastille-badge.argent', 'border-color', '#9aa4ae'],
    ['.pastille-badge.argent', 'background', '#eef1f4'],
    ['.pastille-badge.or', 'border-color', '#d4a017'],
    ['.pastille-badge.or', 'background', '#fbf0c8'],
    ['.pastille-badge.diamant', 'border-color', '#4aa8d8'],
    ['.pastille-badge.diamant', 'background', '#dff1fb'],
    ['.pastille-badge.unique', 'border-color', '#9b59b6'],
    ['.pastille-badge.unique', 'background', '#f1e4f7'],
  ]),
];

function ecran(nom, ecarts) {
  return ecarts.map(([lieu, propriete, valeur]) => ({ ecran: nom, lieu, propriete, valeur }));
}

const lireStyle = () => readFile(new URL('../public/style.css', import.meta.url), 'utf8');

test('Style : public/style.css n\'emploie que les jetons de DESIGN.md, hors exceptions listées', async () => {
  const css = await lireStyle();
  assert.deepEqual(ecartsDeStyle(css, EXCEPTIONS), []);
});

test('Style : les couleurs de DESIGN.md sont celles de public/style.css', async () => {
  const design = await readFile(new URL('../DESIGN.md', import.meta.url), 'utf8');
  const css = await lireStyle();
  assert.deepEqual(ecartsDesign(design, css), []);
});

test('Style : une bordure latérale épaisse (bande de couleur sur le côté d\'une carte) est signalée', () => {
  const css = `.a { border-left: 4px solid var(--accent); } .b { border-inline-start: .25rem solid var(--ligne); }
    .c { border-left: 1px solid var(--bord); } .d { border: 2px solid var(--accent); } .e { border-right-width: 3px; }
    .chevron::before { border-right: 2px solid; border-bottom: 2px solid; }`;
  assert.deepEqual(bordsLateraux(css), [
    '.a { border-left: 4px solid var(--accent) } : bordure latérale épaisse, motif exclu par DESIGN.md. Dire le type par une cartouche ou par la ligne.',
    '.b { border-inline-start: .25rem solid var(--ligne) } : bordure latérale épaisse, motif exclu par DESIGN.md. Dire le type par une cartouche ou par la ligne.',
    '.e { border-right-width: 3px } : bordure latérale épaisse, motif exclu par DESIGN.md. Dire le type par une cartouche ou par la ligne.',
  ]);
});

test('Style : public/style.css n\'a aucune bordure latérale épaisse', async () => {
  assert.deepEqual(bordsLateraux(await lireStyle()), []);
});

// Les bordures d'un seul côté (gauche, droite, début ou fin de ligne) plus épaisses qu'un filet : la bande de couleur
// latérale qu'impeccable signale. Un filet de 1px reste permis, comme un trait de dessin qui tient sur deux côtés
// voisins dans la même règle (le chevron de « Voir les Objectifs »).
function bordsLateraux(css) {
  const toutes = declarations(css);
  const epaisse = (valeur) => [...valeur.matchAll(/(?<![\w.-])(\d*\.?\d+)(px|rem|em)\b/g)].some(([, n, unite]) => Number(n) * (unite === 'px' ? 1 : 16) > 1);
  const dessin = (lieu) => toutes.some((d) => d.lieu === lieu && /^border-(top|bottom|block-start|block-end)(-width)?$/.test(d.propriete) && epaisse(d.valeur));
  return toutes
    .filter(({ propriete }) => /^border-(left|right|inline-start|inline-end)(-width)?$/.test(propriete))
    .filter(({ lieu, valeur }) => epaisse(valeur) && !dessin(lieu))
    .map(({ lieu, propriete, valeur }) => `${lieu} { ${propriete}: ${valeur} } : bordure latérale épaisse, motif exclu par DESIGN.md. Dire le type par une cartouche ou par la ligne.`);
}

// Les déclarations d'une feuille de style, chacune avec son lieu : les préludes des blocs qui l'entourent
// (« @media (prefers-color-scheme: dark) .lecon »). Assez pour public/style.css : commentaires, chaînes et
// parenthèses sont respectés, rien de plus.
function declarations(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const pile = [];
  const resultat = [];
  let tampon = '';
  let parentheses = 0;
  let guillemet = null;
  const vider = () => {
    const texte = tampon.trim();
    tampon = '';
    const deuxPoints = texte.indexOf(':');
    if (!pile.length || deuxPoints < 0) return;
    resultat.push({ pile: [...pile], propriete: texte.slice(0, deuxPoints).trim().toLowerCase(), valeur: texte.slice(deuxPoints + 1).trim() });
  };
  for (const c of source) {
    if (guillemet) { if (c === guillemet) guillemet = null; tampon += c; continue; }
    if (c === '"' || c === "'") guillemet = c;
    else if (c === '(') parentheses++;
    else if (c === ')') parentheses--;
    else if (parentheses === 0 && c === '{') { pile.push(tampon.trim().replace(/\s+/g, ' ')); tampon = ''; continue; }
    else if (parentheses === 0 && c === '}') { vider(); pile.pop(); continue; }
    else if (parentheses === 0 && c === ';') { vider(); continue; }
    tampon += c;
  }
  return resultat.map((d) => ({ ...d, lieu: d.pile.join(' ') }));
}

const COULEURS_NOMMEES = new Set(`aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet
  brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod
  darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick
  floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred
  indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
  lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey
  lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple
  mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred
  papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
  seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato
  turquoise violet wheat white whitesmoke yellow yellowgreen`.split(/\s+/));

// Les couleurs écrites en toutes lettres dans une valeur, dans l'ordre : hex, fonctions de couleur dont le premier
// contenu n'est pas un jeton suivi d'une transparence (rgb(var(--ombre) / .05) en est un usage), couleurs nommées. Chaînes et url() ignorées.
function couleursLitterales(valeur) {
  const texte = valeur.replace(/"[^"]*"|'[^']*'|url\([^)]*\)/g, (m) => ' '.repeat(m.length));
  const trouvees = [];
  for (const m of texte.matchAll(/#[0-9a-f]{3,8}\b/gi)) trouvees.push({ position: m.index, couleur: m[0] });
  for (const m of texte.matchAll(/(?<![\w-])(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi)) {
    let fin = m.index + m[0].length;
    for (let profondeur = 1; fin < texte.length && profondeur > 0; fin++) {
      if (texte[fin] === '(') profondeur++;
      else if (texte[fin] === ')') profondeur--;
    }
    const fonction = texte.slice(m.index, fin);
    const parJeton = /^\w+\(\s*(var\(--[\w-]+\)(\s*\/\s*[\d.]+%?)?|from\s.*)\s*\)$/i.test(fonction);
    if (!parJeton) trouvees.push({ position: m.index, couleur: fonction });
  }
  for (const m of texte.matchAll(/(?<![\w-])[a-z]+(?![\w(-])/gi)) {
    if (COULEURS_NOMMEES.has(m[0].toLowerCase())) trouvees.push({ position: m.index, couleur: m[0] });
  }
  return trouvees.sort((a, b) => a.position - b.position).map((t) => t.couleur);
}

// Les blocs de définition des jetons : le :root clair et le :root sombre.
function estBlocDeJetons(pile) {
  return (pile.length === 1 && pile[0] === ':root')
    || (pile.length === 2 && /^@media \(prefers-color-scheme: ?dark\)$/.test(pile[0]) && pile[1] === ':root');
}

const MOTS_CLES_CSS = /^(inherit|initial|unset|revert|revert-layer)$/i;

// font-family vaut une variable de police ; le raccourci font s'achève sur l'une d'elles.
function policeParJeton(propriete, valeur) {
  if (MOTS_CLES_CSS.test(valeur)) return true;
  const fin = valeur.match(/(^|\s)var\(--police(-titre)?\)$/);
  return Boolean(fin) && (propriete === 'font' || fin.index === 0);
}

// Les écarts de la feuille de style aux jetons, hors exceptions, puis les exceptions qui ne correspondent plus à
// rien. Une exception vise une couleur (ou la valeur d'une police) d'une propriété dans un lieu.
function ecartsDeStyle(css, exceptions) {
  const trouves = [];
  for (const { pile, lieu, propriete, valeur } of declarations(css)) {
    if (/^font(-family)?$/.test(propriete) && pile.at(-1) !== '@font-face' && !policeParJeton(propriete, valeur)) {
      trouves.push({ lieu, propriete, valeur, message: `${lieu} { ${propriete} } : police littérale « ${valeur} ». Utiliser var(--police) ou var(--police-titre) (DESIGN.md, Typography), ou créer une variable de police dans DESIGN.md et le :root de public/style.css.` });
    }
    if (estBlocDeJetons(pile)) continue;
    for (const couleur of new Set(couleursLitterales(valeur))) {
      trouves.push({ lieu, propriete, valeur: couleur, message: `${lieu} { ${propriete} } : couleur en dur ${couleur}. Utiliser un jeton de DESIGN.md (var(--…)), ou en créer un dans DESIGN.md et dans les :root clair et sombre de public/style.css.` });
    }
  }
  const vise = (e, t) => e.lieu === t.lieu && e.propriete === t.propriete && e.valeur === t.valeur;
  return [
    ...trouves.filter((t) => !exceptions.some((e) => vise(e, t))).map((t) => t.message),
    ...exceptions.filter((e) => !trouves.some((t) => vise(e, t)))
      .map((e) => `Exception périmée (${e.ecran}) : ${e.lieu} { ${e.propriete}: ${e.valeur} } n'apparaît plus dans la feuille de style. La retirer de la liste.`),
  ];
}

// Les couleurs du front matter de DESIGN.md (bloc colors), dans l'ordre.
function couleursDuDesign(design) {
  const entete = design.split(/^---$/m)[1] ?? '';
  const bloc = entete.match(/^colors:\n((?:[ \t]+.*\n?)*)/m)?.[1] ?? '';
  return new Map([...bloc.matchAll(/^\s+([\w-]+):\s*"?([^"\n]*?)"?\s*$/gm)].map((m) => [m[1], m[2]]));
}

// Les jetons de couleur d'un :root (clair ou sombre) : les variables dont la valeur est une seule couleur.
function jetonsDeCouleur(css, sombre) {
  return new Map(declarations(css)
    .filter(({ pile }) => estBlocDeJetons(pile) && (pile.length === 2) === sombre)
    .filter(({ propriete, valeur }) => propriete.startsWith('--') && couleursLitterales(valeur).join() === valeur)
    .map(({ propriete, valeur }) => [propriete.slice(2), valeur]));
}

function memeCouleur(a, b) {
  const normale = (c) => c.toLowerCase().replace(/\s+/g, '').replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/, (_, r, v, b, alpha = '') => `#${r}${r}${v}${v}${b}${b}${alpha}${alpha}`);
  return normale(a) === normale(b);
}

// Les désaccords entre les couleurs de DESIGN.md et les jetons de public/style.css. Une couleur « x » est le jeton
// --x du :root clair ; « x-sombre » est --x dans le :root sombre. Un jeton sombre sans entrée « -sombre » (--nuit,
// identique dans les deux thèmes) doit valoir l'entrée claire.
function ecartsDesign(design, css) {
  const couleurs = couleursDuDesign(design);
  const ecarts = [];
  const comparer = (nom, attendue, jetons, jeton, theme) => {
    if (!jetons.has(jeton)) ecarts.push(`${nom} : DESIGN.md dit ${attendue}, le :root ${theme} de public/style.css n'a pas de --${jeton}. Mettre les deux d'accord.`);
    else if (!memeCouleur(attendue, jetons.get(jeton))) ecarts.push(`${nom} : DESIGN.md dit ${attendue}, le :root ${theme} de public/style.css dit ${jetons.get(jeton)}. Mettre les deux d'accord.`);
  };
  const inconnu = (jeton, valeur, theme) => ecarts.push(`--${jeton} : le :root ${theme} de public/style.css le définit (${valeur}), DESIGN.md (colors) ne le nomme pas. Mettre les deux d'accord.`);

  const jetonsClairs = jetonsDeCouleur(css, false);
  for (const [nom, valeur] of couleurs) if (!nom.endsWith('-sombre')) comparer(nom, valeur, jetonsClairs, nom, 'clair');
  for (const [jeton, valeur] of jetonsClairs) if (!couleurs.has(jeton)) inconnu(jeton, valeur, 'clair');

  const sombres = jetonsDeCouleur(css, true);
  for (const [nom, valeur] of couleurs) if (nom.endsWith('-sombre')) comparer(nom, valeur, sombres, nom.slice(0, -'-sombre'.length), 'sombre');
  for (const [jeton, valeur] of sombres) {
    if (couleurs.has(`${jeton}-sombre`)) continue;
    if (couleurs.has(jeton)) comparer(jeton, couleurs.get(jeton), sombres, jeton, 'sombre');
    else inconnu(jeton, valeur, 'sombre');
  }
  return ecarts;
}
