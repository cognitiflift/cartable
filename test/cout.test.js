import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coutDuTour, cumulerCouts } from '../lib/cout.js';
import { TACHES, validerTache } from '../lib/tache.js';

test('Types de tâche : un ensemble fermé (première Séance, page, Rebond, Propositions, Variantes), tout autre refusé', () => {
  assert.deepEqual(TACHES, ['premiereSeance', 'page', 'rebond', 'propositions', 'variantes']);
  assert.equal(validerTache('rebond'), 'rebond');
  assert.throws(() => validerTache('retourQuiz'), /Type de tâche inconnu/);
});

test('Coût d\'un tour : coût, usage, durée et Modèle tirés de la réponse JSON de claude -p', () => {
  const reponse = {
    type: 'result', result: 'ok', session_id: 's', duration_ms: 12345, total_cost_usd: 0.0421,
    usage: { input_tokens: 12, output_tokens: 900, cache_read_input_tokens: 30000, cache_creation_input_tokens: 5000 },
    modelUsage: { 'claude-sonnet-5-5': { costUSD: 0.04 }, 'claude-haiku-5-5': { costUSD: 0.0021 } },
  };
  assert.deepEqual(coutDuTour(reponse, 'page'), {
    tache: 'page', coutUsd: 0.0421, entree: 12, sortie: 900, cacheLu: 30000, cacheEcrit: 5000, dureeMs: 12345,
    modeles: ['claude-sonnet-5-5', 'claude-haiku-5-5'],
  });
});

test('Coût d\'un tour : les champs absents ou mal formés valent 0, sans erreur', () => {
  assert.deepEqual(coutDuTour({ result: 'ok', total_cost_usd: 'cher', usage: null }, 'rebond'), {
    tache: 'rebond', coutUsd: 0, entree: 0, sortie: 0, cacheLu: 0, cacheEcrit: 0, dureeMs: 0, modeles: [],
  });
  assert.equal(coutDuTour(undefined, 'page').coutUsd, 0);
});

test('Coût d\'un tour : un type de tâche inconnu est refusé', () => {
  assert.throws(() => coutDuTour({}, 'bavardage'), /tâche/);
});

test('Cumul : total des tours et détail par type de tâche, chaque type présent même sans tour', () => {
  const tours = [
    { tache: 'premiereSeance', coutUsd: 0.1, entree: 10, sortie: 100, cacheLu: 1000, cacheEcrit: 500, dureeMs: 2000, modeles: ['m'] },
    { tache: 'rebond', coutUsd: 0.2, entree: 20, sortie: 200, cacheLu: 2000, cacheEcrit: 0, dureeMs: 3000, modeles: ['m'] },
    { tache: 'rebond', coutUsd: 0.05, entree: 1, sortie: 2, cacheLu: 3, cacheEcrit: 4, dureeMs: 5, modeles: [] },
  ];
  const vide = { coutUsd: 0, tours: 0, entree: 0, sortie: 0, cacheLu: 0, cacheEcrit: 0, dureeMs: 0 };
  assert.deepEqual(cumulerCouts(tours), {
    total: { coutUsd: 0.35, tours: 3, entree: 31, sortie: 302, cacheLu: 3003, cacheEcrit: 504, dureeMs: 5005 },
    parTache: {
      premiereSeance: { coutUsd: 0.1, tours: 1, entree: 10, sortie: 100, cacheLu: 1000, cacheEcrit: 500, dureeMs: 2000 },
      page: vide,
      rebond: { coutUsd: 0.25, tours: 2, entree: 21, sortie: 202, cacheLu: 2003, cacheEcrit: 4, dureeMs: 3005 },
      propositions: vide,
      variantes: vide,
    },
  });
  assert.deepEqual(cumulerCouts([]).total, vide);
  assert.deepEqual(cumulerCouts(undefined).total, vide);
});

test('Cumul : un tour d\'un type inconnu ou mal formé compte dans le total sans casser le détail', () => {
  const { total, parTache } = cumulerCouts([{ tache: 'ancien', coutUsd: 0.5 }, null]);
  assert.equal(total.coutUsd, 0.5);
  assert.equal(total.tours, 1);
  assert.equal(total.entree, 0);
  assert.deepEqual(Object.keys(parTache), ['premiereSeance', 'page', 'rebond', 'propositions', 'variantes']);
});
