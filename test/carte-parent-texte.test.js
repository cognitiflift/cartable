import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reperesCarte, noteCarte, titreVersions, libelleChoisir, libelleCarteParent } from '../public/carte-parent-texte.js';

const carte = (champs = {}) => ({ lecon: 'a', titre: 'Les volcans', categorie: 'Sciences', statut: 'retournee', generique: false, leconSupprimee: false, versions: [{ numero: 1 }], ...champs });

test('repères : l’état d’abord, puis scène générique et Leçon supprimée', () => {
  assert.deepEqual(reperesCarte(carte()), ['Retournée']);
  assert.deepEqual(reperesCarte(carte({ statut: 'face-cachee', generique: true, leconSupprimee: true })), ['Face cachée', 'Scène générique', 'Leçon supprimée']);
  assert.deepEqual(reperesCarte(carte({ statut: 'en-composition', versions: [] })), ['En composition']);
});

test('notes : seulement quand l’état explique ce qu’on voit', () => {
  assert.match(noteCarte(carte({ statut: 'en-composition' })), /dessine/);
  assert.match(noteCarte(carte({ statut: 'face-cachee' })), /pas encore retournée/);
  assert.equal(noteCarte(carte()), null);
});

test('libellés : le bouton dit la version et la carte, la galerie compte ses versions', () => {
  assert.equal(titreVersions(carte({ versions: [{ numero: 1 }, { numero: 2 }] })), 'Versions (2)');
  assert.equal(libelleChoisir(carte(), { numero: 2 }), 'Utiliser la version 2 de la carte « Les volcans »');
  assert.match(libelleCarteParent(carte()), /1 version$/);
});
