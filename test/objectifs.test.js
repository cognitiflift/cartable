import { test } from 'node:test';
import assert from 'node:assert/strict';
import { objectifsAtteints, etatObjectifs, niveauLecon, calculerMaitrise, palierDeMaitrise, etoilesLecon, depassementLecon } from '../lib/store.js';
import { memoireDeQuestion } from '../lib/memoire.js';

const objectifs = ['Nommer les parties d’un volcan', 'Expliquer une éruption', 'Situer trois volcans'];
const score = (valeur, couverts) => ({ score: valeur, date: '2026-10-01T10:00:00.000Z', ...(couverts && { objectifs: couverts }) });
const atteints = (scores) => objectifsAtteints(objectifs, scores).map((o) => o.atteint);

test('Objectifs atteints : aucun sans score', () => {
  assert.deepEqual(objectifsAtteints(objectifs, []), [
    { texte: 'Nommer les parties d’un volcan', atteint: false },
    { texte: 'Expliquer une éruption', atteint: false },
    { texte: 'Situer trois volcans', atteint: false },
  ]);
});

test('Objectifs atteints : un score de 80 % ou plus atteint les Objectifs qu’il couvre', () => {
  assert.deepEqual(atteints([score(80, [1, 3])]), [true, false, true]);
});

test('Objectifs atteints : un quiz raté n’atteint rien', () => {
  assert.deepEqual(atteints([score(79, [1, 2])]), [false, false, false]);
});

test('Objectifs atteints : un Objectif atteint le reste après un quiz raté', () => {
  assert.deepEqual(atteints([score(90, [2]), score(10, [2])]), [false, true, false]);
});

test('Objectifs atteints : scores anciens sans Objectifs et numéros inexistants ignorés', () => {
  assert.deepEqual(atteints([score(100), score(100, [7, 0])]), [false, false, false]);
});

test('Niveau de Leçon : Objectifs atteints + 1, en commençant au niveau 1', () => {
  const niveau = (scores) => niveauLecon(objectifsAtteints(objectifs, scores), 'libre');
  assert.equal(niveau([]), 1);
  assert.equal(niveau([score(85, [1])]), 2);
  // Un quiz réussi qui ne couvre qu'un Objectif déjà atteint ne change pas le Niveau.
  assert.equal(niveau([score(85, [1]), score(95, [1])]), 2);
  assert.equal(niveau([score(85, [1]), score(40, [2])]), 2);
  assert.equal(niveau([score(85, [1, 2, 3])]), 4);
});

test('Niveau de Leçon : null sans Objectifs ou pour une Leçon de révision', () => {
  assert.equal(niveauLecon([], 'libre'), null);
  assert.equal(niveauLecon(objectifsAtteints(objectifs, []), 'revision'), null);
});

test('Objectifs atteints : en Leçon libre, un quiz fait en Révisant n’atteint rien et ne change pas le Niveau', () => {
  const revise = { ...score(100, [2, 3]), reviser: true };
  const libre = objectifsAtteints(objectifs, [score(85, [1]), revise], 'libre');
  assert.deepEqual(libre.map((o) => o.atteint), [true, false, false]);
  assert.equal(niveauLecon(libre, 'libre'), 2);
  // Leçon de révision : la phase Réviser compte comme une révision ordinaire.
  assert.deepEqual(objectifsAtteints(objectifs, [revise], 'revision').map((o) => o.atteint), [false, true, true]);
});

// Retenu : deux quiz réussis qui couvrent l'Objectif, à au moins 24 heures d'intervalle.
const le = (date, valeur, couverts, marques = {}) => ({ score: valeur, date, objectifs: couverts, ...marques });
const retenus = (scores, mode) => etatObjectifs(objectifs, scores, mode).map((o) => o.retenu);

test('Retenu : deux succès le même jour ne suffisent pas', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-01T20:00:00.000Z', 100, [1])]), [false, false, false]);
});

test('Retenu : deux succès à 25 heures d’écart suffisent, pour les seuls Objectifs couverts les deux fois', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 85, [1, 2]), le('2026-10-02T10:00:00.000Z', 80, [1, 3])]), [true, false, false]);
});

test('Retenu : exactement 24 heures d’écart suffisent, pas une minute de moins', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 85, [1]), le('2026-10-02T09:00:00.000Z', 85, [1])]), [true, false, false]);
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 85, [1]), le('2026-10-02T08:59:00.000Z', 85, [1])]), [false, false, false]);
});

test('Retenu : un quiz raté ne compte pas', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-03T09:00:00.000Z', 79, [1])]), [false, false, false]);
});

test('Retenu : acquis pour toujours, même après des quiz ratés', () => {
  assert.deepEqual(retenus([
    le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-05T09:00:00.000Z', 95, [1]), le('2026-10-09T09:00:00.000Z', 10, [1]),
  ]), [true, false, false]);
});

test('Retenu : les quiz faits en Révisant comptent, le Pré-test non', () => {
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 90, [1, 2]), le('2026-10-03T09:00:00.000Z', 90, [1], { reviser: true })]), [true, false, false]);
  assert.deepEqual(retenus([le('2026-10-01T09:00:00.000Z', 100, [2], { pretest: true }), le('2026-10-03T09:00:00.000Z', 90, [2])]), [false, false, false]);
});

test('Retenu : jamais sans être atteint (deux quiz faits en Révisant une Leçon libre n’atteignent rien)', () => {
  const revises = [le('2026-10-01T09:00:00.000Z', 90, [1], { reviser: true }), le('2026-10-03T09:00:00.000Z', 90, [1], { reviser: true })];
  assert.deepEqual(retenus(revises, 'libre'), [false, false, false]);
  assert.deepEqual(retenus(revises, 'revision'), [true, false, false]);
});

test('Objectifs : l’état de chaque Objectif réunit texte, atteint, Retenu et « à confirmer »', () => {
  assert.deepEqual(etatObjectifs(objectifs, [le('2026-10-01T09:00:00.000Z', 90, [1]), le('2026-10-03T09:00:00.000Z', 90, [1, 2])], 'libre')[0],
    { texte: 'Nommer les parties d’un volcan', atteint: true, retenu: true, aConfirmer: false });
});

test('Retenu : scores anciens sans Objectifs ignorés', () => {
  assert.deepEqual(retenus([{ score: 100, date: '2026-10-01T09:00:00.000Z' }, { score: 100, date: '2026-10-05T09:00:00.000Z' }]), [false, false, false]);
});

// Pré-test : résultats par question, chacune couvrant ses Objectifs.
const question = (juste, couverts, autres = {}) => ({ id: `q${couverts.join('-')}`, enonce: 'Q ?', choisie: 'a', bonne: 'a', juste, bonus: false, objectifs: couverts, ...autres });
const pretest = (...questions) => ({ score: 50, date: '2026-10-01T09:00:00.000Z', pretest: true, questions });
const aConfirmer = (scores, mode = 'libre') => etatObjectifs(objectifs, scores, mode).map((o) => o.aConfirmer);

test('Pré-test : son score n’atteint aucun Objectif, même à 100 %', () => {
  assert.deepEqual(atteints([{ ...score(100, [1, 2]), pretest: true }]), [false, false, false]);
});

test('Pré-test : hors Maîtrise, hors Étoiles et hors Dépassement', () => {
  assert.equal(calculerMaitrise([{ ...score(100), pretest: true }]), null);
  assert.equal(calculerMaitrise([score(60), { ...score(100), pretest: true }], Date.parse('2026-10-02')).pourcentage, 60);
  assert.equal(etoilesLecon([{ ...score(100), pretest: true, bonus: { reussies: 2, total: 2 } }], null, 'revision').quiz, false);
  assert.equal(etoilesLecon([{ ...score(100), pretest: true, bonus: { reussies: 2, total: 2 } }], null, 'revision').bonus, false);
  assert.equal(depassementLecon([{ ...score(100), pretest: true, bonus: { reussies: 2, total: 2 } }], 'libre'), false);
});

test('À confirmer : les Objectifs couverts par une question réussie au Pré-test', () => {
  assert.deepEqual(aConfirmer([pretest(question(true, [2]), question(false, [1]), question(false, [3]))]), [false, true, false]);
});

test('À confirmer : rien sans Pré-test, ni pour une question réussie dans un quiz ordinaire', () => {
  assert.deepEqual(aConfirmer([]), [false, false, false]);
  assert.deepEqual(aConfirmer([{ ...score(50), questions: [question(true, [1])] }]), [false, false, false]);
});

test('À confirmer : plus dès qu’un vrai quiz a atteint l’Objectif', () => {
  assert.deepEqual(aConfirmer([pretest(question(true, [1]), question(true, [2])), score(90, [1])]), [false, true, false]);
});

test('À confirmer : une question bonus réussie ou un Pré-test sans résultats par question ne confirme rien', () => {
  assert.deepEqual(aConfirmer([pretest(question(true, [1], { bonus: true }))]), [false, false, false]);
  assert.deepEqual(aConfirmer([{ ...score(100, [1, 2]), pretest: true }]), [false, false, false]);
});

// Maîtrise et Retenu appuyés sur la mémoire des Questions (spec #47, ticket #67). Une Question de la Banque : son
// contenu (Objectifs couverts) et son journal de réponses (voir lib/banque.js), avec sa mémoire à `maintenant`
// (lib/memoire.js) comme la Leçon la calcule.
const qBanque = (couverts, ...reponses) => ({ id: `q${couverts.join('-')}`, page: '0001-volcans.html', contenu: { objectifs: couverts }, journal: reponses });
const enMemoire = (questions, maintenant) => questions.map((q) => ({ ...q, ...memoireDeQuestion(q.journal, { maintenant }) }));
const maitriseAvec = (scores, maintenant, questions) => calculerMaitrise(scores, maintenant, enMemoire(questions, maintenant));
const juste = (date, autres = {}) => ({ date, juste: true, origine: 'quiz', ...autres });
const faux = (date) => ({ date, juste: false, origine: 'quiz' });
const JOUR = 86_400_000;

test('Maîtrise : avec des Questions, moyenne de leur probabilité de se souvenir aujourd’hui, pas des scores', () => {
  const t = '2026-10-01T10:00:00.000Z';
  // Juste après les réponses : la Question sue compte 100 %, la Question ratée 0 %.
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(t), [qBanque([1], juste(t)), qBanque([2], faux(t))]), { pourcentage: 50, palier: 'à consolider' });
});

test('Maîtrise : une Question dont la dernière réponse est ratée compte 0, jusqu’à une réponse juste', () => {
  const t = '2026-10-01T10:00:00.000Z';
  const lendemain = new Date(Date.parse(t) + JOUR).toISOString();
  const ratee = { date: t, juste: false, jeNeSaisPas: true, origine: 'quiz' };
  // « Je ne sais pas » compte comme raté, même trois jours plus tard.
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(t) + 3 * JOUR, [qBanque([1], ratee)]), { pourcentage: 0, palier: 'à revoir' });
  // Réussie le lendemain (Révision du jour) : elle compte de nouveau, 100 % ; la Question sue la veille ≈ 96 %.
  const questions = [qBanque([1], juste(t)), qBanque([2], faux(t), juste(lendemain, { origine: 'revision' }))];
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(lendemain), questions), { pourcentage: 98, palier: 'bien en tête' });
});

test('Maîtrise : une réponse juste en partie n’est pas ratée, elle suit l’oubli', () => {
  const t = '2026-10-01T10:00:00.000Z';
  // Juste en partie → « difficile » (S = 1,18385) : trois jours plus tard, (1 + 19/81 × 3 / 1,18385)^-0,5 ≈ 79 %.
  const partielle = { date: t, juste: false, points: 0.5, origine: 'quiz' };
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(t) + 3 * JOUR, [qBanque([1], partielle)]), { pourcentage: 79, palier: 'à consolider' });
});

test('Maîtrise : avec des Questions, elle baisse avec l’oubli, paliers 80 % et 50 % inchangés', () => {
  const t = '2026-10-01T10:00:00.000Z';
  const questions = [qBanque([1], juste(t))]; // une réponse juste : stabilité FSRS-5 de 3,173 jours
  // Au bout d'une stabilité, la probabilité de se souvenir vaut 90 %.
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(t) + 3.173 * JOUR, questions), { pourcentage: 90, palier: 'bien en tête' });
  // Au bout de 30 jours : (1 + 19/81 × 30 / 3,173)^-0,5 ≈ 56 %.
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(t) + 30 * JOUR, questions), { pourcentage: 56, palier: 'à consolider' });
  // Au bout d'un an : ≈ 20 %.
  assert.equal(maitriseAvec([score(100)], Date.parse(t) + 365 * JOUR, questions).palier, 'à revoir');
});

test('Maîtrise : une Question ratée et pas encore réussie ne remonte pas avec le temps', () => {
  const t = '2026-10-01T10:00:00.000Z';
  // Trois jours plus tard : sue (S = 3,173) ≈ 90 %, ratée 0 % ; moyenne ≈ 45 %.
  assert.deepEqual(maitriseAvec([score(100)], Date.parse(t) + 3 * JOUR, [qBanque([1], juste(t)), qBanque([2], faux(t))]), { pourcentage: 45, palier: 'à revoir' });
});

test('Maîtrise : sans Questions (anciennes Leçons), même calcul qu’avant', () => {
  const scores = [{ score: 90, date: '2026-09-01T10:00:00.000Z' }, { score: 70, date: '2026-09-01T10:00:00.000Z' }];
  // Moyenne 80, moins 10 points par semaine entière au-delà de 3 semaines (30 jours : 1 semaine).
  assert.deepEqual(calculerMaitrise(scores, Date.parse('2026-10-01T10:00:00.000Z'), []), { pourcentage: 70, palier: 'à consolider' });
  assert.deepEqual(calculerMaitrise(scores, Date.parse('2026-10-01T10:00:00.000Z')), { pourcentage: 70, palier: 'à consolider' });
  assert.equal(calculerMaitrise([], Date.parse('2026-10-01T10:00:00.000Z'), []), null);
});

const retenusAvec = (scores, questions, mode = 'libre') => etatObjectifs(objectifs, scores, mode, enMemoire(questions, Date.parse('2026-10-05T09:00:00.000Z'))).map((o) => o.retenu);
const J1 = '2026-10-01T09:00:00.000Z';
const J2 = '2026-10-02T09:00:00.000Z';

test('Retenu : avec des Questions, une seule réponse juste ne suffit pas (stabilité d’environ 3 jours)', () => {
  assert.deepEqual(retenusAvec([le(J1, 100, [1])], [qBanque([1], juste(J1))]), [false, false, false]);
});

test('Retenu : avec des Questions, deux réponses justes à un jour d’écart suffisent (stabilité d’environ 6 jours)', () => {
  assert.deepEqual(retenusAvec([le(J1, 100, [1]), le(J2, 100, [1])], [qBanque([1], juste(J1), juste(J2))]), [true, false, false]);
});

test('Retenu : avec des Questions, deux réponses justes le même jour ne suffisent pas', () => {
  assert.deepEqual(retenusAvec([le(J1, 100, [1])], [qBanque([1], juste(J1), juste('2026-10-01T15:00:00.000Z'))]), [false, false, false]);
});

test('Retenu : avec des Questions, il suit leur mémoire : une Question oubliée le fait perdre', () => {
  const scores = [le(J1, 100, [1]), le(J2, 100, [1]), le('2026-10-04T09:00:00.000Z', 50, [1])];
  // La règle des deux succès espacés dirait Retenu ; la Question ratée le 4 retombe sous une stabilité de quelques jours.
  assert.deepEqual(retenusAvec(scores, [qBanque([1], juste(J1), juste(J2), faux('2026-10-04T09:00:00.000Z'))]), [false, false, false]);
});

test('Retenu : avec des Questions, toutes celles qui couvrent l’Objectif doivent être stables', () => {
  const scores = [le(J1, 100, [1]), le(J2, 100, [1])];
  assert.deepEqual(retenusAvec(scores, [qBanque([1], juste(J1), juste(J2)), qBanque([1], juste(J2))]), [false, false, false]);
});

test('Retenu : un Objectif qu’aucune Question ne couvre garde la règle des deux succès espacés', () => {
  const scores = [le(J1, 100, [1, 2]), le(J2, 100, [1, 2])];
  assert.deepEqual(retenusAvec(scores, [qBanque([1], juste(J1))]), [false, true, false]);
});

test('Retenu : avec des Questions stables, jamais sans être atteint', () => {
  const revises = [le(J1, 90, [1], { reviser: true }), le(J2, 90, [1], { reviser: true })];
  assert.deepEqual(retenusAvec(revises, [qBanque([1], juste(J1), juste(J2))], 'libre'), [false, false, false]);
});

test('Palier de Maîtrise : à revoir sous 50 %, à consolider de 50 % à moins de 80 %, bien en tête à 80 % ou plus', () => {
  assert.deepEqual([0, 49, 50, 79, 80, 100].map(palierDeMaitrise), ['à revoir', 'à revoir', 'à consolider', 'à consolider', 'bien en tête', 'bien en tête']);
});

test('Palier de Maîtrise : acquis seulement avec au moins un Objectif, tous Retenus, et 80 % ou plus', () => {
  const retenu = { atteint: true, retenu: true };
  const atteint = { atteint: true, retenu: false };
  assert.equal(palierDeMaitrise(79, []), 'à consolider');
  assert.equal(palierDeMaitrise(80, []), 'bien en tête');
  assert.equal(palierDeMaitrise(79, [retenu, retenu]), 'à consolider');
  assert.equal(palierDeMaitrise(80, [retenu, atteint]), 'bien en tête');
  assert.equal(palierDeMaitrise(80, [retenu, retenu]), 'acquis');
  assert.equal(palierDeMaitrise(100, [retenu]), 'acquis');
  assert.equal(palierDeMaitrise(100, []), 'bien en tête');
  assert.equal(palierDeMaitrise(49, [retenu]), 'à revoir');
});
