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
  ...ecran('Nouvelle Leçon : cadrage', [
    ['.cadrage', 'background', 'rgba(0,0,0,.45)'],
    ['@media (prefers-color-scheme: dark) .cadrage', 'background', 'rgba(0,0,0,.75)'],
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

// Le Kit (public/kit/v1/base.css et quiz.css) : une Page de leçon ne charge pas public/style.css, alors le Kit garde
// ses variables --kit-*, mais leurs valeurs sont les jetons de DESIGN.md (#111). Ses jetons se définissent sur :root
// et [data-categorie="…"], en clair et en sombre ; ses polices sont var(--kit-police) et var(--kit-police-titre).

test('Kit : une couleur en dur, une police littérale ou un jeton de l\'appli dans une règle est signalé ; ses jetons et ses polices ne le sont pas', () => {
  const css = `:root { --kit-fond:#f2f4f8; --kit-police:"Atkinson Hyperlegible Next", system-ui, sans-serif; }
    [data-categorie="arts"] { --kit-accent:#db2777; }
    :root, [data-categorie] { --kit-accent-doux: color-mix(in srgb, var(--kit-accent) 12%, var(--kit-carte)); }
    @media (prefers-color-scheme: dark) { :root { --kit-fond:#0f1220; } [data-categorie="arts"] { --kit-accent:#f472b6; } }
    @font-face { font-family:"Overpass"; src:url(/polices/overpass-latin.woff2) format("woff2"); }
    body { font: 18px/1.65 var(--kit-police); } h1 { font-family: var(--kit-police-titre); } .kit-trou { font: inherit; }
    .kit-lecture { color: #fff; } .kit-quiz { font-family: system-ui; } .kit-x { color: var(--fond); }`;
  assert.deepEqual(ecartsDuKit(css).map((e) => e.split('. ')[0]), [
    '.kit-lecture { color } : couleur en dur #fff',
    '.kit-quiz { font-family } : police littérale « system-ui »',
    '.kit-x { color } : jeton de l\'appli var(--fond), absent d\'une Page de leçon',
  ]);
});

test('Kit : une bordure latérale est signalée ; une bordure complète, basse ou retirée ne l\'est pas', () => {
  const css = `.encart, aside { border-left: 5px solid var(--kit-accent); } .a { border-inline-start-width: 4px; }
    .b { border-right: none; border-left: 0; } h2 { border-bottom: 3px solid var(--kit-accent-doux); } .c { border: 1px solid var(--kit-bord); }`;
  assert.deepEqual(ecartsDuKit(css).map((e) => e.split('. ')[0]), [
    '.encart, aside { border-left } : bordure latérale',
    '.a { border-inline-start-width } : bordure latérale',
  ]);
});

test('Kit : les valeurs --kit-* sont les jetons de DESIGN.md, Catégories comprises, en clair et en sombre', () => {
  const design = `---
colors:
  fond: "#f2f4f8"
  accent: "#2747c9"
  ligne-arts: "#db2777"
  ligne-sciences: "#0f8a6a"
  fond-sombre: "#0f1220"
  accent-sombre: "#8aa2ff"
  ligne-arts-sombre: "#f472b6"
  ligne-sciences-sombre: "#34d399"
typography:
  display:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
---`;
  const accord = `:root { --kit-fond:#F2F4F8; --kit-accent:#2747c9; --kit-police:"Atkinson Hyperlegible Next", system-ui, sans-serif;
      --kit-police-titre:"Overpass", "Atkinson Hyperlegible Next", system-ui, sans-serif; color-scheme: light dark; }
    [data-categorie="arts"] { --kit-accent:#db2777; } [data-categorie="sciences"] { --kit-accent:#0f8a6a; }
    :root, [data-categorie] { --kit-accent-doux: color-mix(in srgb, var(--kit-accent) 12%, var(--kit-fond)); }
    @media (prefers-color-scheme: dark) { :root { --kit-fond:#0f1220; --kit-accent:#8aa2ff; }
      [data-categorie="arts"] { --kit-accent:#f472b6; } [data-categorie="sciences"] { --kit-accent:#34d399; } }`;
  assert.deepEqual(ecartsKitDesign(design, accord, { 'kit-fond': 'fond', 'kit-accent': 'accent' }), []);

  const desaccord = `:root { --kit-fond:#fbf8f3; --kit-accent:#2747c9; --kit-rose:#ff00aa; --kit-police: system-ui; }
    [data-categorie="arts"] { --kit-accent:#db2777; }
    @media (prefers-color-scheme: dark) { :root { --kit-accent:#8aa2ff; } [data-categorie="arts"] { --kit-accent:#ff0000; } }`;
  assert.deepEqual(ecartsKitDesign(design, desaccord, { 'kit-fond': 'fond', 'kit-accent': 'accent' }), [
    '--kit-fond (clair) vaut #fbf8f3, le jeton fond de DESIGN.md vaut #f2f4f8.',
    '--kit-rose (clair) vaut #ff00aa, et ne correspond à aucun jeton de DESIGN.md.',
    '--kit-accent de [data-categorie="arts"] (sombre) vaut #ff0000, le jeton ligne-arts-sombre de DESIGN.md vaut #f472b6.',
    '--kit-police vaut « system-ui », DESIGN.md (typography body) dit « Atkinson Hyperlegible Next, system-ui, sans-serif ».',
    '--kit-police-titre : absent, DESIGN.md (typography display) dit « Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif ».',
    '--kit-fond : absent du :root sombre, DESIGN.md a fond-sombre (#0f1220).',
    'ligne-sciences : aucun [data-categorie="sciences"] ne définit --kit-accent en clair.',
    'ligne-sciences-sombre : aucun [data-categorie="sciences"] ne définit --kit-accent en sombre.',
  ]);
});

// Le jeton de DESIGN.md que vaut chaque variable --kit-* du :root du Kit.
const JETONS_DU_KIT = {
  'kit-fond': 'fond', 'kit-texte': 'texte', 'kit-doux': 'doux', 'kit-carte': 'carte', 'kit-bord': 'bord',
  'kit-accent': 'accent', 'kit-sur-accent': 'sur-accent', 'kit-encre-noire': 'encre-noire',
  'kit-juste': 'vert', 'kit-faux': 'rouge',
};

const FEUILLES_DU_KIT = ['base.css', 'quiz.css'];
const lireKit = (feuille) => readFile(new URL(`../public/kit/v1/${feuille}`, import.meta.url), 'utf8');

test('Kit : ses feuilles n\'emploient que ses variables --kit-* et n\'ont pas de bordure latérale', async () => {
  for (const feuille of FEUILLES_DU_KIT) assert.deepEqual(ecartsDuKit(await lireKit(feuille)), [], feuille);
});

test('Kit : ses variables --kit-* valent les jetons de DESIGN.md, Catégories et polices comprises', async () => {
  const design = await readFile(new URL('../DESIGN.md', import.meta.url), 'utf8');
  const css = (await Promise.all(FEUILLES_DU_KIT.map(lireKit))).join('\n');
  assert.deepEqual(ecartsKitDesign(design, css, JETONS_DU_KIT), []);
});

// Les polices du front matter de DESIGN.md (bloc typography) : le fontFamily d'un style (« body », « display »).
function policeDuDesign(design, style) {
  const entete = design.split(/^---$/m)[1] ?? '';
  return entete.match(new RegExp(`^  ${style}:\\n(?:    .*\\n)*?    fontFamily:\\s*"([^"]*)"`, 'm'))?.[1];
}

const memePolice = (a, b) => a.replace(/["']/g, '').split(',').map((s) => s.trim()).join(', ') === b;

// Les désaccords entre les jetons du Kit et ceux de DESIGN.md. `correspondances` dit quel jeton de DESIGN.md vaut
// chaque variable --kit-* du :root (« kit-fond » → « fond ») ; --kit-accent de [data-categorie="x"] vaut « ligne-x ».
// En sombre, la variable vaut « nom-sombre » si DESIGN.md l'a, sinon « nom ». Chaque Catégorie de DESIGN.md a son
// [data-categorie] dans les deux thèmes, et les polices sont celles des styles body et display.
function ecartsKitDesign(design, css, correspondances) {
  const couleurs = couleursDuDesign(design);
  const ecarts = [];
  const definis = { clair: new Map(), sombre: new Map() };
  for (const { pile, propriete, valeur } of declarations(css)) {
    if (!estBlocDeJetonsDuKit(pile) || !propriete.startsWith('--kit-') || couleursLitterales(valeur).join() !== valeur) continue;
    const theme = pile.length === 2 ? 'sombre' : 'clair';
    const selecteur = pile.at(-1);
    const categorie = selecteur.match(/^\[data-categorie="([\w-]+)"\]$/)?.[1];
    const variable = propriete.slice(2);
    const nom = categorie && variable === 'kit-accent' ? `ligne-${categorie}` : selecteur === ':root' ? correspondances[variable] : undefined;
    const ou = categorie ? `${propriete} de ${selecteur} (${theme})` : `${propriete} (${theme})`;
    definis[theme].set(`${selecteur} ${variable}`, valeur);
    if (!nom) { ecarts.push(`${ou} vaut ${valeur}, et ne correspond à aucun jeton de DESIGN.md.`); continue; }
    const jeton = theme === 'sombre' && couleurs.has(`${nom}-sombre`) ? `${nom}-sombre` : nom;
    if (!couleurs.has(jeton)) ecarts.push(`${ou} vaut ${valeur}, le jeton ${jeton} n'est pas dans DESIGN.md.`);
    else if (!memeCouleur(valeur, couleurs.get(jeton))) ecarts.push(`${ou} vaut ${valeur}, le jeton ${jeton} de DESIGN.md vaut ${couleurs.get(jeton)}.`);
  }

  const polices = new Map(declarations(css).filter(({ pile }) => pile.length === 1 && pile[0] === ':root').map((d) => [d.propriete, d.valeur]));
  for (const [variable, style] of [['--kit-police', 'body'], ['--kit-police-titre', 'display']]) {
    const attendue = policeDuDesign(design, style);
    if (!polices.has(variable)) ecarts.push(`${variable} : absent, DESIGN.md (typography ${style}) dit « ${attendue} ».`);
    else if (!memePolice(polices.get(variable), attendue)) ecarts.push(`${variable} vaut « ${polices.get(variable)} », DESIGN.md (typography ${style}) dit « ${attendue} ».`);
  }

  for (const [variable, nom] of Object.entries(correspondances)) {
    if (!definis.clair.has(`:root ${variable}`)) ecarts.push(`--${variable} : absent du :root clair, DESIGN.md a ${nom} (${couleurs.get(nom)}).`);
    if (couleurs.has(`${nom}-sombre`) && !definis.sombre.has(`:root ${variable}`)) ecarts.push(`--${variable} : absent du :root sombre, DESIGN.md a ${nom}-sombre (${couleurs.get(`${nom}-sombre`)}).`);
  }
  for (const nom of couleurs.keys()) {
    const m = nom.match(/^ligne-([\w-]+?)(-sombre)?$/);
    if (!m) continue;
    const theme = m[2] ? 'sombre' : 'clair';
    if (!definis[theme].has(`[data-categorie="${m[1]}"] kit-accent`)) ecarts.push(`${nom} : aucun [data-categorie="${m[1]}"] ne définit --kit-accent en ${theme}.`);
  }
  return ecarts;
}

// Les blocs de définition des jetons du Kit : :root et [data-categorie…] (seuls ou ensemble), en clair et en sombre.
function estBlocDeJetonsDuKit(pile) {
  const selecteur = /^(:root|\[data-categorie(="[\w-]+")?\])(, ?(:root|\[data-categorie(="[\w-]+")?\]))*$/;
  return (pile.length === 1 && selecteur.test(pile[0]))
    || (pile.length === 2 && /^@media \(prefers-color-scheme: ?dark\)$/.test(pile[0]) && selecteur.test(pile[1]));
}

// font-family vaut une variable de police du Kit ; le raccourci font s'achève sur l'une d'elles.
function policeParJetonDuKit(propriete, valeur) {
  if (MOTS_CLES_CSS.test(valeur)) return true;
  const fin = valeur.match(/(^|\s)var\(--kit-police(-titre)?\)$/);
  return Boolean(fin) && (propriete === 'font' || fin.index === 0);
}

// Les écarts d'une feuille du Kit à ses jetons : couleurs en dur et polices littérales hors de ses jetons, et jetons
// de l'appli (var(--fond)…), qu'une Page de leçon n'a pas.
function ecartsDuKit(css) {
  const ecarts = [];
  for (const { pile, lieu, propriete, valeur } of declarations(css)) {
    if (/^font(-family)?$/.test(propriete) && pile.at(-1) !== '@font-face' && !policeParJetonDuKit(propriete, valeur)) {
      ecarts.push(`${lieu} { ${propriete} } : police littérale « ${valeur} ». Utiliser var(--kit-police) ou var(--kit-police-titre).`);
    }
    if (/^border-(left|right|inline-start|inline-end|inline)(-width|-style)?$/.test(propriete) && !/^(none|0(px)?|hidden)$/i.test(valeur)) {
      ecarts.push(`${lieu} { ${propriete} } : bordure latérale. DESIGN.md n'en a pas : mettre le bloc en valeur par son fond ou son filet complet.`);
    }
    if (estBlocDeJetonsDuKit(pile)) continue;
    for (const couleur of new Set(couleursLitterales(valeur))) {
      ecarts.push(`${lieu} { ${propriete} } : couleur en dur ${couleur}. Utiliser une variable --kit-* dont la valeur est un jeton de DESIGN.md.`);
    }
    for (const [jeton] of valeur.matchAll(/var\(--(?!kit-)[\w-]+\)/g)) {
      ecarts.push(`${lieu} { ${propriete} } : jeton de l'appli ${jeton}, absent d'une Page de leçon. Utiliser une variable --kit-*.`);
    }
  }
  return ecarts;
}
