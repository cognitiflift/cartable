import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore } from '../lib/store.js';

let dossier, store;

beforeEach(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-store-'));
  store = createStore(dossier);
  await store.creerEleve({ pseudo: 'Zoé', age: 10, niveau: 'Primaire 5' });
  // Le 4 octobre 2026 à 0 h 30, heure locale.
  mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 4, 0, 30) });
});

afterEach(async () => {
  mock.timers.reset();
  await fs.rm(dossier, { recursive: true, force: true });
});

test('Leçon libre : identifiant date + sujet', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: 'Les volcans', mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-les-volcans');
});

test('Leçon libre : accents et ponctuation donnent un slug propre', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: "L'été à Noël !", mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-l-ete-a-noel');
});

test('Leçon libre : sujet vide une fois converti donne « lecon »', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: '🌋 ?!', mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-lecon');
});

test('Leçon libre : sujet très long tronqué sur un tiret, 60 caractères au plus, doublon compris', async () => {
  const sujet = 'Pourquoi les volcans entrent-ils en éruption et comment les scientifiques prévoient-ils les catastrophes ?';
  const premiere = await store.creerLecon('zoe', { sujet, mode: 'libre' });
  const seconde = await store.creerLecon('zoe', { sujet, mode: 'libre' });
  assert.equal(premiere.id, '2026-10-04-pourquoi-les-volcans-entrent-ils-en-eruption-et');
  assert.equal(seconde.id, '2026-10-04-pourquoi-les-volcans-entrent-ils-en-eruption-et-2');
  assert.equal(seconde.id.length, 60);
  assert.equal((await store.lireLecon('zoe', seconde.id)).sujet, sujet);
});

test('Leçon libre : un seul mot très long est coupé net', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: 'a'.repeat(80), mode: 'libre' });
  assert.equal(lecon.id, `2026-10-04-${'a'.repeat(49)}`);
});

test('Deux créations simultanées sur le même sujet visent deux dossiers distincts', async () => {
  const lecons = await Promise.all([1, 2, 3].map(() => store.creerLecon('zoe', { sujet: 'Les volcans', mode: 'libre' })));
  assert.deepEqual(lecons.map((l) => l.id).sort(), ['2026-10-04-les-volcans', '2026-10-04-les-volcans-2', '2026-10-04-les-volcans-3']);
});

test('La date est la date locale de création, même tard le soir', async () => {
  mock.timers.setTime(new Date(2026, 9, 4, 23, 30).getTime());
  const lecon = await store.creerLecon('zoe', { sujet: 'Les volcans', mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-les-volcans');
});

test('Une Leçon existante à l\'ancien format l-… se liste, se lit et reçoit des scores', async () => {
  const dir = path.join(store.elevesDir, 'zoe', 'lecons', 'l-mutm4ihi');
  await fs.mkdir(path.join(dir, 'lessons'), { recursive: true });
  const etat = { id: 'l-mutm4ihi', sujet: 'Les fractions', mode: 'libre', sessionId: 's-1', creee: '2026-09-01T10:00:00.000Z', derniereActivite: '2026-09-01T10:00:00.000Z', messages: [], scores: [] };
  await fs.writeFile(path.join(dir, 'etat.json'), JSON.stringify(etat));
  await fs.writeFile(path.join(dir, 'lessons', '0001-fractions.html'), '<h1>Fractions</h1>');

  assert.deepEqual((await store.listerLecons('zoe')).map((l) => l.id), ['l-mutm4ihi']);
  assert.deepEqual((await store.lireLecon('zoe', 'l-mutm4ihi')).pages, ['0001-fractions.html']);
  await store.enregistrerScore('zoe', 'l-mutm4ihi', { score: 90 });
  assert.equal((await store.lireLecon('zoe', 'l-mutm4ihi')).maitrise.palier, 'acquis');
});

test('Leçon de révision : identifiant date + revision, suffixe -2 le même jour', async () => {
  const premiere = await store.creerLecon('zoe', { sujet: 'Révision', mode: 'revision' });
  const seconde = await store.creerLecon('zoe', { sujet: 'Révision', mode: 'revision' });
  assert.equal(premiere.id, '2026-10-04-revision');
  assert.equal(seconde.id, '2026-10-04-revision-2');
  assert.equal((await store.lireLecon('zoe', premiere.id)).mode, 'revision');
});
