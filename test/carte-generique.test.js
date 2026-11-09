import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sceneGenerique } from '../lib/carte-generique.js';
import { lireCalques, CALQUES } from '../lib/carte-svg.js';

const CATEGORIES = ['Français', 'Mathématiques', 'Sciences', 'Histoire', 'Géographie', 'Langues', 'Arts', 'Autre'];

test('la scène générique passe le filtre, pour chaque Catégorie et une Catégorie inconnue', () => {
  for (const categorie of [...CATEGORIES, 'Cuisine', undefined]) {
    const scene = sceneGenerique({ lecon: '2026-11-10-les-volcans', categorie });
    const r = lireCalques(JSON.stringify(scene), '2026-11-10-les-volcans');
    assert.equal(r.ok, true, `${categorie} : ${r.erreurs}`);
    assert.deepEqual(Object.keys(scene), CALQUES);
  }
});

test('même Leçon, même carte ; une autre Leçon donne une autre scène', () => {
  const a = sceneGenerique({ lecon: 'a-1', categorie: 'Sciences' });
  assert.deepEqual(sceneGenerique({ lecon: 'a-1', categorie: 'Sciences' }), a);
  assert.notDeepEqual(sceneGenerique({ lecon: 'b-2', categorie: 'Sciences' }), a);
});

test('la couleur de la scène suit la Catégorie', () => {
  assert.match(sceneGenerique({ lecon: 'x', categorie: 'Géographie' }).l1, /var\(--ligne-geographie\)/);
  assert.match(sceneGenerique({ lecon: 'x', categorie: 'Cuisine' }).l1, /var\(--ligne-autre\)/);
});

test('aucun disque du héros ne sort du cadre : sur « Mon réseau » à 390 px, il flottait à côté de la carte', () => {
  for (const lecon of ['x', 'a-1', '2026-11-10-les-volcans', 'zzz', 'volcans', 'troie']) {
    const { heros } = sceneGenerique({ lecon, categorie: 'Sciences' });
    for (const [, cx, r] of heros.matchAll(/<circle cx="([\d.-]+)"[^>]*\br="([\d.]+)"/g).map((m) => [m[0], Number(m[1]), Number(m[2])])) {
      assert.ok(cx - r >= 0 && cx + r <= 200, `disque de centre ${cx} et de rayon ${r} hors du cadre (${lecon})`);
    }
  }
});

test('le héros déborde du cadre et la zone basse reste calme', () => {
  const { heros, l2 } = sceneGenerique({ lecon: 'x', categorie: 'Sciences' });
  assert.match(heros, /-\d|\b2[1-9]\d\b/); // une coordonnée hors du cadre 0–200
  assert.doesNotMatch(l2, /<(circle|path|rect|ellipse)[^>]*\by="(1[89]\d|2\d\d)"/); // rien d'important entre y 180 et 280
});
