import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pastilleRevisions } from '../public/pastille-revisions.js';

test('46 Questions dues : la pastille affiche 10, texte caché compris', () => {
  const p = pastilleRevisions({ dues: 46 }, 0);
  assert.equal(p.compte, 10);
  assert.equal(p.cache, ' questions');
});

test('3 Questions dues : la pastille affiche 3', () => {
  assert.equal(pastilleRevisions({ dues: 3 }, 0).compte, 3);
});

test('1 Question due : texte caché au singulier', () => {
  assert.equal(pastilleRevisions({ dues: 1 }, 0).cache, ' question');
});

test('avant 10 réponses du jour : « à revoir aujourd’hui »', () => {
  assert.equal(pastilleRevisions({ dues: 46 }, 9).sousTitre, 'à revoir aujourd’hui');
});

test('à 10 réponses du jour et des Questions encore dues : « Continuer à réviser »', () => {
  assert.equal(pastilleRevisions({ dues: 36 }, 10).sousTitre, 'Continuer à réviser');
  assert.equal(pastilleRevisions({ dues: 1 }, 25).sousTitre, 'Continuer à réviser');
});

test('aucune Question due : pas de pastille, « Rien à revoir aujourd’hui », même après une série', () => {
  for (const faites of [0, 10]) {
    const p = pastilleRevisions({ dues: 0 }, faites);
    assert.equal(p.compte, 0);
    assert.equal(p.sousTitre, 'Rien à revoir aujourd’hui');
  }
});

test('le nombre de réponses du jour inconnu (rythme absent) compte pour 0', () => {
  assert.equal(pastilleRevisions({ dues: 5 }, undefined).sousTitre, 'à revoir aujourd’hui');
});
