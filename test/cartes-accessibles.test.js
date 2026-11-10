import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { libelleCarteLigne } from '../public/carte-ligne-texte.js';
import { sceneGenerique } from '../lib/carte-generique.js';
import { libelleCarteBadge, libelleADecouvrir } from '../public/carte-badge-texte.js';
import { artDeBadge, IDS_FAMILLES } from '../public/carte-badge-art.js';
import { nouvellesCartes, TEXTES_CEREMONIE } from '../public/nouvelles-cartes.js';

// Passe d'accessibilité des cartes et de la cérémonie (#188, spec #182) : textes alternatifs, dessin masqué, cibles,
// focus, mouvement. Le DOM réel est vérifié au navigateur ; ici, ce que les textes et les feuilles de style garantissent.
const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../public/style.css', import.meta.url), 'utf8');
const dire = (j) => `le ${j}`;
const bloc = (source, debut) => { const i = source.indexOf(debut); assert.ok(i >= 0, `introuvable : ${debut}`); return source.slice(i, source.indexOf('\n}\n', i) + 3); };
const regle = (selecteur) => css.split('\n').find((l) => l.startsWith(`${selecteur} {`)) ?? '';
const rem = (declarations, propriete) => Number(new RegExp(`${propriete}:\\s*([\\d.]+)rem`).exec(declarations)?.[1] ?? 0);

test('Cartes : chaque libellé dit le nom, le Palier ou la Catégorie, la date et ce que la carte salue', () => {
  const ligne = { titre: 'Les volcans', categorie: 'Sciences', objectifs: 3, jourAcquisition: '2026-11-11' };
  const l = libelleCarteLigne(ligne, dire);
  for (const mot of ['Les volcans', 'Sciences', 'le 2026-11-11', '3 Objectifs Retenus']) assert.ok(l.includes(mot), mot);
  const badge = { nom: 'Mémoire', emoji: '🧠', phrase: 'Les Objectifs qui restent en mémoire.', palier: 'or', paliers: [{ palier: 'or', jour: '2026-11-03' }] };
  const b = libelleCarteBadge(badge, dire);
  for (const mot of ['Mémoire', 'Palier or', 'le 2026-11-03', 'Les Objectifs qui restent en mémoire.']) assert.ok(b.includes(mot), mot);
  assert.match(libelleADecouvrir({ nom: 'Curieux', phrase: 'Les bonnes réponses.' }), /Curieux, à découvrir\. Les bonnes/);
});

test('Cartes : une carte face cachée n\'est ni sans nom ni bavarde : elle dit qu\'elle attend, sans le Palier', () => {
  const [ligne, palier] = nouvellesCartes({
    aRetourner: [{ type: 'ligne', id: 'l1' }, { type: 'palier', id: 'memoire', palier: 'or' }],
    collection: [{ id: 'memoire', nom: 'Mémoire', emoji: '🧠', palier: 'or' }], cartesLigne: [{ lecon: 'l1', titre: 'Les volcans' }] });
  for (const c of [ligne, palier]) { assert.match(c.libelle, /face cachée/); assert.match(c.libelle, /Touche pour la retourner/); assert.doesNotMatch(c.libelle, /\bor\b|bronze|argent|diamant/i); }
  assert.match(TEXTES_CEREMONIE.dialogue('Mémoire'), /Mémoire/);
});

test('Cartes : le dessin (scène générique, art des Badges) est masqué aux lecteurs d\'écran et ne porte aucun texte', () => {
  const scene = sceneGenerique({ lecon: 'l1', categorie: 'Sciences' });
  const familles = IDS_FAMILLES.map((id) => artDeBadge({ id, nom: id, palier: 'or' }, 3));
  // La scène générique vient du serveur : son svg est masqué par le div de calque (vérifié plus bas), pas par un attribut.
  for (const svg of Object.values(scene)) assert.doesNotMatch(svg, /<(title|desc|text)\b/);
  for (const svg of familles.flatMap((a) => [a.l1, a.l2, a.heros])) {
    assert.match(svg, /^<svg [^>]*aria-hidden="true"[^>]*focusable="false"/);
    assert.doesNotMatch(svg, /<(title|desc|text)\b/);
  }
  // Dans les constructeurs de cartes, chaque calque, le texte de face, le dos et le reflet sont aria-hidden : seul le bouton parle.
  for (const nom of ['function carteLigne(', 'function carteBadge(']) {
    const code = bloc(app, nom);
    assert.match(code, /const calque = \(classe, svg\) => h\('div', \{ className: `cl-calque \$\{classe\}`, ariaHidden: 'true'/);
    for (const classe of ['cl-cadre', 'cl-bord', 'cl-texte', 'cl-reflet', 'cl-face cl-dos']) assert.match(code, new RegExp(`'${classe}', ariaHidden: 'true'`), `${nom} ${classe}`);
    assert.match(code, /ariaLabel: /);
  }
  assert.match(bloc(app, 'function carteFaceCachee('), /cl-medaillon', ariaHidden: 'true'/);
});

test('Cérémonie : le focus entre dans le dialogue, suit la carte retournée, puis revient là où l\'Élève était', () => {
  const code = bloc(app, 'function ceremonie(');
  assert.match(code, /const ouvreur = document\.activeElement/, 'l\'élément qui a ouvert est retenu');
  assert.match(code, /dlg\.addEventListener\('close', \(\) => \{\s*dlg\.remove\(\);/);
  assert.match(code, /ouvreur\.isConnected \? ouvreur : document\.querySelector\(`\[data-cle=/, 'le groupe est redessiné : le focus retrouve la carte par sa clé, ou le titre du groupe');
  assert.match(code, /vraie\.focus\(\)/, 'le bouton retourné est retiré de la scène : le focus passe à la vraie carte');
  assert.match(code, /ok\.focus\(\)/);
  assert.match(code, /oncancel|Escape|'close'/); // Échap ferme (natif) et la carte reste retournée, non rangée
});

test('Cérémonie : les boucles du décor tournent pendant la cérémonie, bornées, et seulement au survol, au focus ou là', () => {
  assert.match(bloc(app, 'function animerCarte('), /setTimeout\(\(\) => el\.classList\.remove\('regarde'\), DUREE_BOUCLES\)/);
  assert.ok(Number(/DUREE_BOUCLES = (\d+)/.exec(app)[1]) <= 8000, 'quelques secondes');
  assert.match(bloc(app, 'function ceremonie('), /vraie\.focus\(\)/); // le focus (listener de animerCarte) lance les boucles, qui s'arrêtent seules
  const boucles = css.split('\n').filter((l) => /animation:[^;]*\binfinite\b/.test(l) && /\.pc-a-/.test(l));
  assert.ok(boucles.length > 0);
  for (const l of boucles) assert.match(l, /^\.carte-ligne-carte\.regarde /, l); // jamais en dehors de .regarde
});

test('Mouvement : sous prefers-reduced-motion, ni animation, ni transition, ni inclinaison, ni éclats ; la cérémonie reste fonctionnelle', () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \* \{ transition:none !important; animation:none !important; \} \}/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.cer-eclats \{ display:none; \}/);
  assert.match(app, /const pointeur = \(e\) => \{[^]*?if \(moinsDeMouvement\(\)\) return;/, 'pas d\'inclinaison');
  assert.match(bloc(app, 'function ceremonie('), /moinsDeMouvement\(\) \? 0 : DUREE_CEREMONIE/, 'le nom et le bouton d\'ajout apparaissent d\'emblée');
});

test('Mouvement : aucun éclair rapide (WCAG 2.3.1) : la lueur d\'éclair ne tombe jamais sous la moitié de son éclat', () => {
  const eclair = /@keyframes pc-eclair \{([^\n]*?)\} \}/m.exec(css)[1];
  const opacites = [...eclair.matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.min(...opacites) >= 0.5, `opacités : ${opacites}`);
});

test('Cibles : chaque bouton de carte et de cérémonie fait au moins 44 px, anneau de focus visible', () => {
  for (const s of ['.cer-ok', '.cer-plus-tard']) assert.ok(rem(regle(s), 'min-height') >= 2.75, `${s} : min-height ≥ 2.75rem`);
  assert.match(regle('.carte-ligne-carte:focus-visible'), /outline:3px solid var\(--accent\)/);
  assert.match(css, /\.cer-ok:focus-visible, \.cer-plus-tard:focus-visible \{ outline:3px solid/);
  assert.match(css, /\.cartes-ceremonie :focus-visible \{[^}]*outline-color:var\(--sur-nuit\)/, 'sur le voile sombre, l\'anneau est clair');
  assert.match(css, /\.carte-ligne-carte \{[^}]*aspect-ratio:5\/7/);
});
