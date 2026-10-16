import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recompensesDeLEleve, totauxRecompenses } from '../lib/recompenses.js';

// Dates en heure locale : les jours de l'Élève sont ceux de sa machine (voir lib/jour.js).
const a = (jour, heure = 12) => { const [an, mois, j] = jour.split('-').map(Number); return new Date(an, mois - 1, j, heure).getTime(); };
const iso = (jour, heure) => new Date(a(jour, heure)).toISOString();
const lecon = (champs = {}) => ({ id: 'l', mode: 'libre', categorie: 'Sciences', terminee: null, objectifs: [], scores: [], questions: [], ...champs });
const reussi = (jour, page, champs = {}) => ({ score: 90, date: iso(jour), page, ...champs });
const fusee = { reussies: 2, total: 3 };

test('Totaux de l\'Élève : Étoiles des Leçons (pages en Leçon libre, 3 nommées en révision) et des Révisions du jour, Fusées de toutes les Leçons', () => {
  const libre = lecon({ scores: [
    reussi('2026-10-01', 'p1', { bonus: fusee }),
    reussi('2026-10-02', 'p1', { bonus: fusee }), // page déjà récompensée
    reussi('2026-10-02', 'p2'),
    { score: 40, date: iso('2026-10-03'), page: 'p3' },
    reussi('2026-10-04', 'p4', { pretest: true, bonus: fusee }), // Pré-test : rien
  ] });
  const revision = lecon({ id: 'r', mode: 'revision', terminee: iso('2026-10-08'), scores: [
    reussi('2026-10-05', 'q1'),
    reussi('2026-10-06', 'q2', { bonus: fusee }),
    reussi('2026-10-08', 'q3', { defi: true }),
  ] });
  const revisions = { questions: [{ journal: [{ date: iso('2026-10-07'), juste: false, origine: 'revision' }] }], scores: [], mode: 'libre' };
  const contexte = { lecons: [libre, revision, revisions], evenements: [], maintenant: a('2026-10-20') };
  assert.deepEqual(totauxRecompenses(contexte), { etoiles: 6, fusees: 2 });
  assert.deepEqual(recompensesDeLEleve(contexte), {
    etoiles: ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'],
    fusees: ['2026-10-01', '2026-10-06'],
  });
});
