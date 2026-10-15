import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activiteParJour, objectifDuJour, serieDeJours, recapitulatifSemaine } from '../lib/rythme.js';
import { jourLocal } from '../lib/jour.js';

// Dates en heure locale : les jours de l'Élève sont ceux de sa machine (voir lib/jour.js).
const a = (jour, heure = 12) => { const [an, mois, j] = jour.split('-').map(Number); return new Date(an, mois - 1, j, heure).getTime(); };
const iso = (jour, heure) => new Date(a(jour, heure)).toISOString();

// Une Leçon telle que lireLecon la renvoie, réduite à ce qui compte : ses scores et le journal de ses Questions.
const lecon = ({ revisions = [], quiz = [], pages = [] } = {}) => ({
  scores: pages.map(([jour, page, marques = {}]) => ({ score: 50, date: iso(jour), page, ...marques })),
  questions: [{ journal: [
    ...quiz.map((jour) => ({ date: iso(jour), juste: true, origine: 'quiz' })),
    ...revisions.map((jour) => ({ date: iso(jour), juste: false, origine: 'revision' })),
  ] }],
});

test('Activité : Révisions du jour répondues (dont justes), pages terminées et quiz faits, par jour local, toutes Leçons', () => {
  const activite = activiteParJour([
    lecon({ revisions: ['2026-10-12', '2026-10-12'], quiz: ['2026-10-12'], pages: [['2026-10-12', '0002-a.html']] }),
    lecon({ revisions: ['2026-10-12', '2026-10-13'], pages: [['2026-10-13', '0002-b.html'], ['2026-10-13', '0003-c.html']] }),
  ]);
  assert.deepEqual(activite, {
    '2026-10-12': { revisions: 3, justes: 0, pages: 1, quiz: 1 },
    '2026-10-13': { revisions: 1, justes: 0, pages: 2, quiz: 2 },
  });
});

test('Activité : une page refaite le même jour ne compte qu\'une fois (mais ses deux quiz comptent) ; le Pré-test ne compte pas', () => {
  const activite = activiteParJour([lecon({ pages: [
    ['2026-10-12', '0002-a.html'], ['2026-10-12', '0002-a.html'], ['2026-10-12', '0001-pretest.html', { pretest: true }],
  ] })]);
  assert.deepEqual(activite, { '2026-10-12': { revisions: 0, justes: 0, pages: 1, quiz: 2 } });
});

test('Activité : le jour est celui de l\'heure locale, minuit compris', () => {
  const activite = activiteParJour([{ scores: [], questions: [{ journal: [
    { date: iso('2026-10-12', 23), origine: 'revision', juste: true }, { date: iso('2026-10-13', 0), origine: 'revision' },
  ] }] }]);
  assert.deepEqual(activite, { '2026-10-12': { revisions: 1, justes: 1, pages: 0, quiz: 0 }, '2026-10-13': { revisions: 1, justes: 0, pages: 0, quiz: 0 } });
});

test('Objectif du jour : 5 Révisions du jour ou une Page de leçon', () => {
  const activite = { '2026-10-12': { revisions: 4, pages: 0 }, '2026-10-13': { revisions: 5, pages: 0 }, '2026-10-14': { revisions: 0, pages: 1 } };
  assert.deepEqual(objectifDuJour(activite, a('2026-10-12')), { revisions: 4, revisionsVisees: 5, pages: 0, pagesVisees: 1, atteint: false });
  assert.equal(objectifDuJour(activite, a('2026-10-13')).atteint, true);
  assert.equal(objectifDuJour(activite, a('2026-10-14')).atteint, true);
  assert.deepEqual(objectifDuJour(activite, a('2026-10-15')), { revisions: 0, revisionsVisees: 5, pages: 0, pagesVisees: 1, atteint: false });
});

// Historique où l'objectif est atteint chacun des jours donnés (« AAAA-MM-JJ »), et à moitié fait les jours `entames`.
const historique = (jours, entames = []) => Object.fromEntries([
  ...entames.map((j) => [j, { revisions: 2, pages: 0 }]),
  ...jours.map((j) => [j, { revisions: 5, pages: 0 }]),
]);
// `n` jours de suite à partir de `debut` (inclus).
const suite = (debut, n) => Array.from({ length: n }, (_, i) => { const d = new Date(a(debut)); d.setDate(d.getDate() + i); return jourLocal(d); });

test('Série : aucun jour, aucune série ni joker', () => {
  assert.deepEqual(serieDeJours({}, a('2026-10-15')), { jours: 0, jokers: 0, jokersUtilises: 0, aujourdhui: false });
});

test('Série : les jours de suite où l\'objectif est atteint ; aujourd\'hui pas encore atteint ne la casse pas', () => {
  const activite = historique(['2026-10-12', '2026-10-13', '2026-10-14']);
  assert.deepEqual(serieDeJours(activite, a('2026-10-14')), { jours: 3, jokers: 0, jokersUtilises: 0, aujourdhui: true });
  assert.deepEqual(serieDeJours(activite, a('2026-10-15', 20)), { jours: 3, jokers: 0, jokersUtilises: 0, aujourdhui: false });
});

test('Série : un jour manqué sans joker la fait repartir ; un jour entamé sans atteindre l\'objectif compte comme manqué', () => {
  const activite = historique(['2026-10-10', '2026-10-11', '2026-10-13', '2026-10-14'], ['2026-10-12']);
  assert.equal(serieDeJours(activite, a('2026-10-14')).jours, 2);
  assert.equal(serieDeJours(historique(['2026-10-12', '2026-10-13']), a('2026-10-15')).jours, 0);
});

test('Jokers : un gagné par semaine complète de série, il protège la série d\'un jour manqué, utilisé tout seul', () => {
  const semaine = suite('2026-10-01', 7);
  assert.deepEqual(serieDeJours(historique(semaine), a('2026-10-07')), { jours: 7, jokers: 1, jokersUtilises: 0, aujourdhui: true });
  // Le 8 manqué : le joker protège la série, qui continue le 9.
  assert.deepEqual(serieDeJours(historique([...semaine, '2026-10-09']), a('2026-10-09')), { jours: 8, jokers: 0, jokersUtilises: 1, aujourdhui: true });
  // Pas encore revenu : la série tient grâce au joker.
  assert.deepEqual(serieDeJours(historique(semaine), a('2026-10-09', 8)), { jours: 7, jokers: 0, jokersUtilises: 1, aujourdhui: false });
});

test('Jokers : deux au plus en réserve', () => {
  assert.deepEqual(serieDeJours(historique(suite('2026-09-01', 21)), a('2026-09-21')), { jours: 21, jokers: 2, jokersUtilises: 0, aujourdhui: true });
  // Deux jours manqués (le 22 et le 23) : les deux jokers les couvrent.
  const activite = historique([...suite('2026-09-01', 21), '2026-09-24']);
  assert.deepEqual(serieDeJours(activite, a('2026-09-24')), { jours: 22, jokers: 0, jokersUtilises: 2, aujourdhui: true });
});

test('Jokers : une pause plus longue que la réserve fait repartir la série, sans gaspiller les jokers', () => {
  const activite = historique([...suite('2026-10-01', 7), '2026-10-11']);
  assert.deepEqual(serieDeJours(activite, a('2026-10-11')), { jours: 1, jokers: 1, jokersUtilises: 0, aujourdhui: true });
});

test('Série : les jours se comptent au calendrier local, changement d\'heure compris', () => {
  // Passage à l'heure d'hiver le 25 octobre 2026 en Europe : un jour de 25 heures.
  assert.equal(serieDeJours(historique(suite('2026-10-20', 10)), a('2026-10-29')).jours, 10);
});

// Récapitulatif : la semaine passée, du lundi 5 au dimanche 11 octobre 2026, vue le mercredi 14.
const MERCREDI = a('2026-10-14');
const reussi = (jour, objectifs) => ({ score: 100, date: iso(jour), page: `${jour}.html`, objectifs });
const leconLibre = (scores, questions = []) => ({ mode: 'libre', objectifs: ['Un', 'Deux', 'Trois'].map((texte) => ({ texte })), scores, questions });

test('Récapitulatif de la semaine : les Objectifs devenus Retenus la semaine passée (deux succès espacés)', () => {
  const lecons = [leconLibre([
    reussi('2026-09-30', [1]), reussi('2026-10-06', [1]), // Retenu le 6 : compte
    reussi('2026-09-20', [2]), reussi('2026-09-25', [2]), // déjà Retenu avant la semaine
    reussi('2026-10-10', [3]), reussi('2026-10-14', [3]), // Retenu cette semaine-ci : pour le prochain récapitulatif
  ])];
  assert.deepEqual(recapitulatifSemaine(lecons, MERCREDI), {
    du: '2026-10-05', au: '2026-10-11', objectifsRetenus: 1, revisions: 0, pages: 2, joursAtteints: 2,
  });
});

test('Récapitulatif de la semaine : un Objectif suivi par ses Questions devient Retenu quand leur mémoire tient', () => {
  const question = { contenu: { objectifs: [1] }, journal: [
    { date: iso('2026-10-05'), juste: true, sur: true, origine: 'quiz' },
    { date: iso('2026-10-07'), juste: true, sur: true, origine: 'revision' },
  ] };
  const recap = recapitulatifSemaine([leconLibre([reussi('2026-10-05', [1])], [question])], MERCREDI);
  assert.equal(recap.objectifsRetenus, 1);
  assert.equal(recap.revisions, 1);
  // Vu la semaine du quiz : la semaine d'avant est vide, pas de récapitulatif.
  assert.equal(recapitulatifSemaine([leconLibre([reussi('2026-10-05', [1])], [question])], a('2026-10-07')), null);
});

test('Récapitulatif de la semaine : rien quand la semaine passée est vide, sans reproche', () => {
  assert.equal(recapitulatifSemaine([leconLibre([reussi('2026-10-12', [1])])], MERCREDI), null);
  assert.equal(recapitulatifSemaine([], MERCREDI), null);
});

test('Récapitulatif de la semaine : le lundi, c\'est la semaine qui vient de finir', () => {
  const recap = recapitulatifSemaine([leconLibre([reussi('2026-10-11', [1])])], a('2026-10-12', 8));
  assert.equal(recap.du, '2026-10-05');
  assert.equal(recap.au, '2026-10-11');
  assert.equal(recap.pages, 1);
});

test('Récapitulatif de la semaine : au premier retour de la semaine seulement, pas les jours suivants', () => {
  const lecons = [leconLibre([reussi('2026-10-06', [1])])];
  // Premier retour le mercredi 14 : le récapitulatif s'affiche, toute la journée.
  assert.equal(recapitulatifSemaine(lecons, MERCREDI).du, '2026-10-05');
  assert.equal(recapitulatifSemaine(lecons, MERCREDI, { joursActifs: ['2026-10-14', '2026-10-11'] }).du, '2026-10-05');
  // Déjà revenu le lundi 12 (accueil affiché, ou page faite) : plus de récapitulatif le mercredi.
  assert.equal(recapitulatifSemaine(lecons, MERCREDI, { joursActifs: ['2026-10-12'] }), null);
  assert.equal(recapitulatifSemaine([leconLibre([reussi('2026-10-06', [1]), reussi('2026-10-13', [2])])], MERCREDI), null);
});
