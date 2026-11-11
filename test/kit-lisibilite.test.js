// Kit (#173, parent #170) : Valider est l'action principale, lignes de texte bornées, aucune carte dans une carte,
// flèches de l'ordre désactivées à 3:1 au moins (WCAG 1.4.11). Les règles sont lues dans les feuilles du Kit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const lire = (f) => readFile(new URL(`../public/kit/v1/${f}`, import.meta.url), 'utf8');
const quiz = await lire('quiz.css');
const base = await lire('base.css');

const DEBUT_SOMBRE = quiz.indexOf('@media (prefers-color-scheme: dark)');
const clair = quiz.slice(0, DEBUT_SOMBRE);
const sombreCss = quiz.slice(DEBUT_SOMBRE, quiz.indexOf('/* Quiz */'));

// Corps déclaré d'une règle dont le sélecteur est exactement `sel` (dans la partie hors thème sombre).
function regle(css, sel) {
  const horsSombre = css.includes('@media (prefers-color-scheme: dark)') ? css.replace(sombreCss, '') : css;
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = horsSombre.match(new RegExp(`(?:^|\\})\\s*${esc}\\s*\\{([^}]*)\\}`, 'm'));
  return m ? m[1] : null;
}
// Jetons --kit-* d'un thème : le :root clair, ou le clair surchargé par le :root du bloc sombre.
function jetons(sombre) {
  const j = {};
  const lus = [clair.match(/:root \{([^}]*)\}/)[1]];
  if (sombre) lus.push(sombreCss.match(/:root \{([^}]*)\}/)[1]);
  for (const bloc of lus) for (const [, nom, val] of bloc.matchAll(/(--kit-[a-z-]+):\s*([^;]+);/g)) j[nom] = val.trim();
  return j;
}
const rgb = (h) => { const n = h.replace('#', ''); const t = n.length === 3 ? [...n].map((c) => c + c).join('') : n; return [0, 2, 4].map((i) => parseInt(t.slice(i, i + 2), 16)); };
const lum = (c) => c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const contraste = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

for (const sombre of [false, true]) {
  const nom = sombre ? 'sombre' : 'clair';
  test(`Kit : flèche de l'ordre désactivée, contour à 3:1 au moins contre la carte et le fond (${nom})`, () => {
    const j = jetons(sombre);
    const r = regle(quiz, '.kit-ordre-fleche:disabled');
    assert.ok(r, 'règle .kit-ordre-fleche:disabled');
    assert.doesNotMatch(r, /opacity/, 'pas d\'opacité qui délave le contour');
    const m = r.match(/border-color:\s*var\((--kit-[a-z-]+)\)/);
    assert.ok(m, 'contour désactivé par un jeton --kit-*');
    assert.match(r, /border-style:\s*dashed/, 'reste reconnaissable comme désactivée sans la couleur (WCAG 1.4.1)');
    const couleur = j[m[1]];
    assert.ok(contraste(couleur, j['--kit-carte']) >= 3, `contour sur carte : ${contraste(couleur, j['--kit-carte']).toFixed(2)}`);
    assert.ok(contraste(couleur, j['--kit-fond']) >= 3, `contour sur fond : ${contraste(couleur, j['--kit-fond']).toFixed(2)}`);
  });
}

test('Kit : Valider est le bouton plein du quiz, « Je ne sais pas » reste secondaire', () => {
  const v = regle(quiz, '.kit-quiz-valider');
  assert.match(v, /background:\s*var\(--kit-accent-fort\)/);
  assert.match(v, /color:\s*var\(--kit-sur-accent\)/);
  assert.match(v, /font-weight:\s*700/);
  assert.match(v, /min-height:\s*2\.6/);
  assert.ok(!/--kit-accent-doux/.test(v));
  const s = regle(quiz, '.kit-quiz-reponse.kit-secondaire');
  assert.match(s, /background:\s*var\(--kit-carte\)/);
  assert.match(s, /color:\s*var\(--kit-doux\)/);
});

test('Kit : le texte de Valider (sur-accent) tient 4,5:1 sur l\'aplat accent-fort de chaque Catégorie, clair et sombre', () => {
  // clair : accent-fort = 82 % accent + 18 % noir ; sombre : accent-fort = accent.
  for (const sombre of [false, true]) {
    const j = jetons(sombre);
    const bloc = sombre ? sombreCss : clair;
    const accents = [j['--kit-accent'], ...[...bloc.matchAll(/\[data-categorie="[a-z]+"\]\s*\{\s*--kit-accent:\s*(#[0-9a-f]{6})/g)].map((m) => m[1])];
    assert.equal(accents.length, 10);
    for (const a of accents) {
      const fort = sombre ? a : '#' + rgb(a).map((v) => Math.round(v * 0.82).toString(16).padStart(2, '0')).join('');
      assert.ok(contraste(j['--kit-sur-accent'], fort) >= 4.5, `${a} (${sombre ? 'sombre' : 'clair'}) : ${contraste(j['--kit-sur-accent'], fort).toFixed(2)}`);
    }
  }
});

test('Kit : le texte courant tient dans une mesure d\'environ 75 caractères', () => {
  const q = regle(quiz, '.kit-quiz-question');
  assert.match(q, /max-width:\s*calc\(var\(--kit-mesure\)/, 'la carte d\'une question borne sa mesure par --kit-mesure');
  assert.match(quiz, /--kit-mesure:\s*45ch/, 'la mesure est un jeton, en ch');
  const t = regle(base, ':is(p, li, figcaption):not(:is(table, .encart, aside) *)');
  assert.match(t, /max-width:\s*var\(--kit-mesure\)/, 'texte de la page borné, hors encarts et tableaux');
});

test('Kit : aucune carte dans une carte (revoir la figure, dévoilé, révélation de la Prédiction)', () => {
  for (const sel of ['.kit-revoir .kit-quiz-figure', '.kit-devoile-reponse', '.kit-prediction-revelation:not(:empty)']) {
    const r = regle(quiz, sel);
    assert.ok(r, sel);
    assert.doesNotMatch(r, /(^|[\s;])border(-style)?:/, `${sel} : pas de second cadre`);
    assert.doesNotMatch(r, /box-shadow/);
    assert.match(r, /background:/, `${sel} : un fond à la place du cadre`);
  }
});
