import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activiteParJour, objectifDuJour, serieDeJours, joursCouvertsParJoker, joursReparesDeSerie, meilleureSerie, reparationDeSerie, recapitulatifSemaine, joursTravailles } from '../lib/rythme.js';
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

test('Série : aucun jour, aucune série, mais déjà 3 Jokers pour la semaine', () => {
  assert.deepEqual(serieDeJours({}, a('2026-10-15')), { jours: 0, jokers: 3, jokersUtilises: 0, aujourdhui: false });
});

test('Série : les jours de suite où l\'objectif est atteint ; aujourd\'hui pas encore atteint ne la casse pas', () => {
  const activite = historique(['2026-10-12', '2026-10-13', '2026-10-14']);
  assert.deepEqual(serieDeJours(activite, a('2026-10-14')), { jours: 3, jokers: 3, jokersUtilises: 0, aujourdhui: true });
  assert.deepEqual(serieDeJours(activite, a('2026-10-15', 20)), { jours: 3, jokers: 3, jokersUtilises: 0, aujourdhui: false });
});

test('Série : un jour entamé sans atteindre l\'objectif compte comme manqué (un Joker le couvre)', () => {
  const activite = historique(['2026-10-12', '2026-10-14'], ['2026-10-13']);
  assert.deepEqual(serieDeJours(activite, a('2026-10-14')), { jours: 2, jokers: 2, jokersUtilises: 1, aujourdhui: true });
  assert.deepEqual(joursCouvertsParJoker(activite, a('2026-10-14')), ['2026-10-13']);
});

// Semaine du lundi 12 au dimanche 18 octobre 2026.
test('Jokers : 3 par semaine dès la première, chacun couvre tout seul un jour manqué', () => {
  // Atteint lundi 12, manqué mardi 13, atteint mercredi 14.
  assert.deepEqual(serieDeJours(historique(['2026-10-12', '2026-10-14']), a('2026-10-14')), { jours: 2, jokers: 2, jokersUtilises: 1, aujourdhui: true });
  // Pas encore revenu jeudi 15 : le Joker couvre déjà mercredi 14, la série tient.
  assert.deepEqual(serieDeJours(historique(['2026-10-12', '2026-10-13']), a('2026-10-15', 20)), { jours: 2, jokers: 2, jokersUtilises: 1, aujourdhui: false });
});

test('Jokers : trois jours manqués dans la semaine sont couverts, un quatrième fait repartir la série', () => {
  // Manqués mardi 13, mercredi 14, jeudi 15 : couverts.
  const trois = historique(['2026-10-12', '2026-10-16']);
  assert.deepEqual(serieDeJours(trois, a('2026-10-16')), { jours: 2, jokers: 0, jokersUtilises: 3, aujourdhui: true });
  assert.deepEqual(joursCouvertsParJoker(trois, a('2026-10-16')), ['2026-10-13', '2026-10-14', '2026-10-15']);
  // Manqués aussi en deux fois : mardi 13, puis jeudi 15 et vendredi 16 : couverts.
  assert.deepEqual(serieDeJours(historique(['2026-10-12', '2026-10-14', '2026-10-17']), a('2026-10-17')), { jours: 3, jokers: 0, jokersUtilises: 3, aujourdhui: true });
  // Un quatrième, vendredi 16 : la série repart samedi 17 ; les Jokers dépensés le restent.
  const quatre = historique(['2026-10-12', '2026-10-17']);
  assert.deepEqual(serieDeJours(quatre, a('2026-10-17')), { jours: 1, jokers: 0, jokersUtilises: 0, aujourdhui: true });
  assert.deepEqual(joursCouvertsParJoker(quatre, a('2026-10-17')), []);
});

test('Jokers : ceux qui restent ne se reportent pas sur la semaine suivante', () => {
  // Aucun Joker utilisé la semaine du 5 ; la semaine du 12 en a 3, pas 6 : quatre jours manqués (13 au 16) la cassent.
  const activite = historique([...suite('2026-10-05', 8), '2026-10-17']);
  assert.deepEqual(serieDeJours(activite, a('2026-10-17')), { jours: 1, jokers: 0, jokersUtilises: 0, aujourdhui: true });
  // Et la réserve repasse à 3 chaque lundi, même après une semaine où tout a servi.
  assert.deepEqual(serieDeJours(historique(['2026-10-12', '2026-10-16', '2026-10-17', '2026-10-18']), a('2026-10-19')), { jours: 4, jokers: 3, jokersUtilises: 3, aujourdhui: false });
});

test('Jokers : une pause à cheval sur deux semaines utilise les Jokers de chacune pour ses jours', () => {
  // Atteint jeudi 15 ; manqués du vendredi 16 au mercredi 21 : 3 jours la semaine du 12, 3 la semaine du 19.
  const activite = historique(['2026-10-15', '2026-10-22']);
  assert.deepEqual(serieDeJours(activite, a('2026-10-22')), { jours: 2, jokers: 0, jokersUtilises: 6, aujourdhui: true });
  assert.deepEqual(joursCouvertsParJoker(activite, a('2026-10-22')), suite('2026-10-16', 6));
  // Un jour de plus (jeudi 22 manqué aussi) : la semaine du 19 n'a plus de quoi, la série repart vendredi 23.
  assert.deepEqual(serieDeJours(historique(['2026-10-15', '2026-10-23']), a('2026-10-23')), { jours: 1, jokers: 0, jokersUtilises: 0, aujourdhui: true });
});

test('Jokers : les jours couverts restent dans l\'historique, même d\'une série passée', () => {
  const activite = historique(['2026-10-05', '2026-10-07', '2026-10-17']);
  assert.deepEqual(joursCouvertsParJoker(activite, a('2026-10-17')), ['2026-10-06']);
  assert.equal(serieDeJours(activite, a('2026-10-17')).jours, 1);
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

test('Jours travaillés : au moins une réponse ce jour-là (quiz de page, Pré-test ou Révision du jour), triés, chacun une fois', () => {
  const jours = joursTravailles([
    lecon({ revisions: ['2026-10-14', '2026-10-14'], pages: [['2026-10-12', '0002-a.html']] }),
    lecon({ quiz: ['2026-10-12'], pages: [['2026-10-10', '0001-pretest.html', { pretest: true }], ['2026-10-11', undefined]] }),
  ]);
  assert.deepEqual(jours, ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-14']);
  assert.deepEqual(joursTravailles([]), []);
});

// Réparation (#159). Semaine du lundi 5 au dimanche 11 octobre : atteint lundi 5 ; mardi 6, mercredi 7 et jeudi 8 couverts
// par les 3 Jokers ; vendredi 9 manqué sans Joker : la série repart. Samedi 10 est le jour de retour.
const double = { revisions: 10, pages: 0 };

test('Réparation : deux fois l\'Objectif du jour le jour du retour reprend la série, le jour manqué est réparé', () => {
  const activite = { ...historique(['2026-10-05']), '2026-10-10': double };
  const m = a('2026-10-10');
  // 1 jour avant la pause + le jour de retour ; le jour réparé compte comme couvert (4 « Jokers »), pas comme atteint.
  assert.deepEqual(serieDeJours(activite, m), { jours: 2, jokers: 0, jokersUtilises: 4, aujourdhui: true });
  assert.deepEqual(joursReparesDeSerie(activite, m), ['2026-10-09']);
  assert.deepEqual(joursCouvertsParJoker(activite, m), ['2026-10-06', '2026-10-07', '2026-10-08']);
  assert.equal(reparationDeSerie(activite, m), null);
  assert.deepEqual(meilleureSerie(activite, m), { meilleure: 2, jours: 2 });
  // Deux Pages de leçon valent dix Révisions du jour.
  assert.equal(serieDeJours({ ...historique(['2026-10-05']), '2026-10-10': { revisions: 0, pages: 2 } }, m).jours, 2);
});

test('Réparation : une seule fois l\'Objectif du jour ne répare pas ; la réparation est proposée le jour même seulement', () => {
  const m = a('2026-10-10');
  // Samedi, rien encore : la série est repartie, la réparation est proposée avec ce qu'il reste à faire.
  const rien = historique(['2026-10-05']);
  assert.equal(serieDeJours(rien, m).jours, 0);
  assert.deepEqual(reparationDeSerie(rien, m), { jourManque: '2026-10-09', serieAvant: 1, revisions: 0, revisionsVisees: 10, pages: 0, pagesVisees: 2 });
  // Samedi, l'objectif atteint une fois : la série repart à 1, la réparation reste proposée.
  const une = { ...rien, '2026-10-10': { revisions: 5, pages: 0 } };
  assert.equal(serieDeJours(une, m).jours, 1);
  assert.equal(reparationDeSerie(une, m).revisions, 5);
  assert.deepEqual(joursReparesDeSerie(une, m), []);
  // Dimanche : le jour de retour est passé, plus de réparation, la série est perdue ; la meilleure série reste.
  const apres = { ...une, '2026-10-11': { revisions: 5, pages: 0 } };
  assert.equal(reparationDeSerie(apres, a('2026-10-11')), null);
  assert.deepEqual(serieDeJours(apres, a('2026-10-11')), { jours: 2, jokers: 0, jokersUtilises: 0, aujourdhui: true });
  assert.deepEqual(meilleureSerie(apres, a('2026-10-11')), { meilleure: 2, jours: 2 });
});

test('Réparation : une pause de deux jours non couverts ne se répare pas', () => {
  // Vendredi 9 et samedi 10 non couverts ; retour dimanche 11 avec deux fois l'objectif.
  const activite = { ...historique(['2026-10-05']), '2026-10-11': double };
  assert.equal(reparationDeSerie(activite, a('2026-10-11')), null); // samedi, la réparation était encore possible
  assert.deepEqual(serieDeJours(activite, a('2026-10-11')), { jours: 1, jokers: 0, jokersUtilises: 0, aujourdhui: true });
  assert.deepEqual(joursReparesDeSerie(activite, a('2026-10-11')), []);
});

test('Réparation : à cheval sur deux semaines, la pause d\'un jour non couvert se répare avec les Jokers de chacune', () => {
  // Atteint jeudi 15 ; manqués du vendredi 16 au mercredi 21 couverts (3 + 3) ; jeudi 22 sans Joker ; retour vendredi 23.
  const activite = { ...historique(['2026-10-15']), '2026-10-23': double };
  assert.deepEqual(serieDeJours(activite, a('2026-10-23')), { jours: 2, jokers: 0, jokersUtilises: 7, aujourdhui: true });
  assert.deepEqual(joursReparesDeSerie(activite, a('2026-10-23')), ['2026-10-22']);
  assert.deepEqual(joursCouvertsParJoker(activite, a('2026-10-23')), suite('2026-10-16', 6));
});

test('Réparation : changement d\'heure (nuit du 24 au 25 octobre), le jour manqué et le retour se suivent au calendrier', () => {
  // Atteint mardi 20 ; couverts 21, 22, 23 ; non couvert samedi 24 ; retour dimanche 25, jour de 25 heures.
  const tard = { ...historique(['2026-10-20']), '2026-10-25': double };
  assert.deepEqual(joursReparesDeSerie(tard, a('2026-10-25')), ['2026-10-24']);
  assert.equal(serieDeJours(tard, a('2026-10-25')).jours, 2);
});

test('Meilleure série : la plus longue de l\'historique, même quand la série en cours est plus courte', () => {
  const activite = historique([...suite('2026-09-01', 5), '2026-10-20']);
  assert.deepEqual(meilleureSerie(activite, a('2026-10-20')), { meilleure: 5, jours: 1 });
  assert.deepEqual(meilleureSerie({}, a('2026-10-20')), { meilleure: 0, jours: 0 });
});
