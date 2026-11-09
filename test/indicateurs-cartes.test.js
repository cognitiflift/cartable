import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indicateurs } from '../lib/indicateurs.js';

// Indicateurs des cartes (spec #182, ticket #190) : lus dans le fichier de cartes (dates « prête » et « retournée »,
// essais, état) et dans le Coût des tours « carte ». Dates maîtrisées : jours locaux de novembre 2026, à midi.
const d = (jour, heure = 12) => new Date(2026, 10, jour, heure).toISOString();
const maintenant = new Date(2026, 10, 20, 12).getTime();
const carte = (id, extra) => ({ lecon: id, etat: 'prete', essais: 1, prete: d(1), retourne: null, ...extra });
const fichier = (...cartes) => ({ cartes: Object.fromEntries(cartes.map((c) => [c.lecon, c])) });
const mesure = (cartes, couts) => indicateurs([], { maintenant, cartes, couts }).cartes;

test('sans fichier de cartes, des mesures vides', () => {
  assert.deepEqual(mesure(null), {
    pretes: 0, nonRetourneesA7Jours: { cartes: 0, jamais: 0, pourcentage: null }, delaiMedianHeures: null,
    composees: { composees: 0, generiques: 0, pourcentage: null }, echecs: 0, coutMoyenUsd: null,
  });
});

test('jamais retournées au bout de sept jours : seules les cartes prêtes depuis sept jours comptent', () => {
  const m = mesure(fichier(
    carte('a', { retourne: d(3) }), // retournée au bout de 2 jours
    carte('b', { retourne: d(12) }), // retournée au bout de 11 jours : pas retournée au bout de sept
    carte('c'), // jamais
    carte('d', { prete: d(15) }), // trop récente (5 jours)
    carte('e', { etat: 'a-composer', prete: null }), // pas prête
  )).nonRetourneesA7Jours;
  assert.deepEqual(m, { cartes: 3, jamais: 2, pourcentage: 67 });
});

test('délai médian entre prête et retournée, en heures, sur les cartes retournées', () => {
  const m = mesure(fichier(
    carte('a', { prete: d(1, 12), retourne: d(1, 14) }), // 2 h
    carte('b', { prete: d(1, 12), retourne: d(2, 12) }), // 24 h
    carte('c', { prete: d(1, 12), retourne: d(4, 12) }), // 72 h
    carte('d'), // pas retournée : écartée
  ));
  assert.equal(m.delaiMedianHeures, 24);
  assert.equal(m.pretes, 4);
});

test('cartes composées par l’agent contre scènes de repli, et échecs de composition', () => {
  const m = mesure(fichier(
    carte('a'), // réussie du premier coup : 0 échec
    carte('b', { essais: 2 }), // réussie au second essai : 1 échec
    carte('c', { etat: 'generique', essais: 2 }), // deux échecs
    carte('d', { etat: 'a-composer', essais: 1, prete: null }), // un échec, en attente de reprise
    carte('e', { etat: 'en-composition', essais: 1, prete: null }), // tentative en cours : pas d'échec
    carte('f', { etat: 'a-composer', essais: 0, prete: null }),
  ));
  assert.deepEqual(m.composees, { composees: 2, generiques: 1, pourcentage: 67 });
  assert.equal(m.echecs, 4);
});

test('coût moyen d’une carte : coût des tours « carte » sur les cartes composées par l’agent', () => {
  const couts = { parTache: { carte: { coutUsd: 0.3, tours: 4 } } };
  const m = mesure(fichier(carte('a'), carte('b'), carte('c', { etat: 'generique' })), couts);
  assert.equal(m.coutMoyenUsd, 0.15);
  assert.equal(mesure(fichier(carte('c', { etat: 'generique' })), couts).coutMoyenUsd, null);
});
