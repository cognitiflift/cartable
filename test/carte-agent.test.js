import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { consignesCarte, promptCarte } from '../lib/carte-agent.js';
import { JETONS, CLASSES, TAILLE_MAX } from '../lib/carte-svg.js';

const carte = { lecon: '2026-11-10-les-volcans', titre: 'Les volcans', categorie: 'Sciences', objectifs: 4 };
const titresObjectifs = ['Savoir d’où vient la lave', 'Reconnaître les parties d’un volcan'];

test('la Trousse donne le format, les zones calmes, l’exactitude, les symboles, les animations et le JSON attendu', () => {
  const t = consignesCarte();
  assert.match(t, /200 × 280/);
  assert.match(t, /haut à gauche/i);
  assert.match(t, /pastille/);
  assert.match(t, /exact/i);
  assert.match(t, /symbole/i);
  assert.match(t, /clignot/i);
  assert.match(t, /une ou deux animations/i);
  assert.match(t, /"l1".*"l2".*"heros"/s);
  assert.match(t, new RegExp(String(TAILLE_MAX)));
  for (const c of CLASSES) assert.ok(t.includes(c), c);
});

test('chaque jeton de la Trousse existe dans les :root clair et sombre de style.css', () => {
  const css = fs.readFileSync(new URL('../public/style.css', import.meta.url), 'utf8');
  const racines = css.match(/:root\s*\{[^}]*\}/g) ?? [];
  assert.ok(racines.length >= 2);
  const t = consignesCarte();
  for (const j of JETONS) {
    assert.ok(t.includes(`--${j}`), `Trousse : --${j}`);
    assert.ok(racines.some((r) => new RegExp(`--${j}:`).test(r)), `style.css : --${j}`);
  }
});

test('le prompt donne l’identifiant, le sujet, la Catégorie et les titres des Objectifs', () => {
  const p = promptCarte(carte, titresObjectifs);
  assert.match(p, /2026-11-10-les-volcans/);
  assert.match(p, /Les volcans/);
  assert.match(p, /var\(--ligne-sciences\)/);
  for (const o of titresObjectifs) assert.ok(p.includes(o));
  assert.match(promptCarte({ ...carte, categorie: 'Numérique' }, []), /var\(--ligne-numerique\)/);
  assert.match(promptCarte({ ...carte, categorie: 'Cuisine' }, []), /var\(--ligne-autre\)/);
});
