import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Écran de Séance (#172) : règles lues dans public/style.css (pas de navigateur dans npm test).
const css = readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
const regle = (selecteur) => {
  const trouvees = [...css.matchAll(/(^|\})\s*([^{}@]+)\{([^}]*)\}/g)].filter((m) => m[2].split(',').map((s) => s.trim()).includes(selecteur));
  return trouvees.map((m) => m[3]).join(' ');
};
const rem = (decl, prop) => {
  const m = decl.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*([\\d.]+)rem`));
  return m ? Number(m[1]) : 0;
};

test('Séance : le sélecteur de pages a une cible tactile de 44 px (2,75 rem) et de l\'air autour', () => {
  const d = regle('.panneau select');
  assert.ok(rem(d, 'min-height') >= 2.75, 'min-height >= 2.75rem');
  assert.match(d, /margin:\s*\.[5-9]\d*rem\s+(1|\.[89])\d*rem/);
});

test('Séance : le sélecteur de la fiche a la même cible tactile', () => {
  assert.ok(rem(regle('.fiche-barre select'), 'min-height') >= 2.75);
});

test('Séance à 390 px : le titre se range sur la ligne du lien, la ligne de progression vient en dessous', () => {
  const debut = css.indexOf('@media (max-width: 640px) { .seance-tete');
  assert.ok(debut >= 0, 'bloc @media 640px de .seance-tete');
  let prof = 0, fin = debut;
  for (; fin < css.length; fin++) { if (css[fin] === '{') prof++; if (css[fin] === '}' && --prof === 0) break; }
  const mobile = css.slice(debut, fin + 1);
  assert.match(mobile, /\.seance-titre \{ display:contents/);
  assert.match(mobile, /\.seance-tete \.ligne \{[^}]*order:/);
  assert.match(mobile, /\.seance-titre h2 \{[^}]*text-overflow:ellipsis/);
});
