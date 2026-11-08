import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indicateurs } from '../lib/indicateurs.js';

// Mesures « avant » de la spec #145 (ticket #147) : lues dans les Leçons (scores, journal des Questions), sans tour du
// prof. Dates maîtrisées : jours locaux d'octobre 2026, à midi.
const a = (jour, heure = 12) => new Date(2026, 9, jour, heure).getTime();
const iso = (jour, heure = 12) => new Date(a(jour, heure)).toISOString();
const rep = (jour, extra = {}) => ({ date: iso(jour), juste: true, origine: 'revision', ...extra });
const quiz = (jour, extra = {}) => ({ date: iso(jour), juste: true, origine: 'quiz', ...extra });
const score = (jour, valeur, extra = {}) => ({ score: valeur, date: iso(jour), page: `p${jour}.html`, ...extra });
const lecon = (scores = [], questions = []) => ({ scores, questions });
const periode = { maintenant: a(10), du: '2026-10-01', au: '2026-10-10' };

test('Je ne sais pas : part des réponses, quiz de page et Révision du jour séparément ; Pré-test et réponses hors période écartés', () => {
  const l = lecon([
    score(2, 50, { questions: [{ id: 'a', jeNeSaisPas: true }, { id: 'b' }, { id: 'c' }, { id: 'd', jeNeSaisPas: true }] }),
    score(3, 0, { pretest: true, questions: [{ id: 'a', jeNeSaisPas: true }] }),
    score(2, 100), // ancien score, sans résultats par question
  ], [{ journal: [
    rep(2, { jeNeSaisPas: true, juste: false }), rep(3), rep(4),
    quiz(5, { jeNeSaisPas: true }), // réponse de quiz du journal : déjà comptée par les scores
    { ...rep(2, { jeNeSaisPas: true }), date: new Date(2026, 8, 20).toISOString() }, // hors période
  ] }]);
  const { jeNeSaisPas } = indicateurs([], { ...periode, lecons: [l] });
  assert.deepEqual(jeNeSaisPas.quiz, { reponses: 4, jeNeSaisPas: 2, pourcentage: 50 });
  assert.deepEqual(jeNeSaisPas.revision, { reponses: 3, jeNeSaisPas: 1, pourcentage: 33 });
});

test('Je ne sais pas : sans réponse, pas de pourcentage', () => {
  const vide = { reponses: 0, jeNeSaisPas: 0, pourcentage: null };
  assert.deepEqual(indicateurs([], periode).jeNeSaisPas, { quiz: vide, revision: vide });
});

test('Réussite par Rebond : moyenne des scores selon le Rebond de la page ; Pré-test écarté, ancien Défi classé par son marqueur', () => {
  const l = lecon([
    score(1, 60, { rebond: 'nouvelle' }), score(2, 80, { rebond: 'nouvelle' }),
    score(3, 90, { rebond: 'revoir', bonus: { reussies: 0, total: 2 } }), // le bonus n'entre pas dans le score
    score(4, 100, { rebond: 'defi' }), score(5, 100, { defi: true }),
    score(6, 20, { rebond: 'reviser' }), score(7, 10, { rebond: 'reviser', pretest: true }),
    score(8, 70), // ancien score sans Rebond ni Défi : pas classé
    { ...score(0, 0, { rebond: 'revoir' }), date: new Date(2026, 8, 20).toISOString() }, // hors période
  ]);
  assert.deepEqual(indicateurs([], { ...periode, lecons: [l] }).reussiteParRebond, {
    nouvelle: { quiz: 2, pourcentage: 70 }, revoir: { quiz: 1, pourcentage: 90 },
    defi: { quiz: 2, pourcentage: 100 }, reviser: { quiz: 1, pourcentage: 20 },
  });
});

test('Réussite par Rebond : une période sans quiz donne des mesures vides', () => {
  const vide = { quiz: 0, pourcentage: null };
  assert.deepEqual(indicateurs([], periode).reussiteParRebond, { nouvelle: vide, revoir: vide, defi: vide, reviser: vide });
});

test('Révisions des jours dus : part des jours où des Questions étaient dues et où une Révision du jour a été répondue', () => {
  // Une Question ratée le 1er (quiz) est due le 2 ; ratée de nouveau en Révision du jour, elle est due le 3, et ainsi de suite.
  const q = { journal: [quiz(1, { juste: false }), rep(2, { juste: false })] }; // une réponse fausse revient le lendemain
  const r = indicateurs([], { ...periode, lecons: [lecon([], [q])] }).revisionsDesJoursDus;
  assert.ok(r.jours >= 2, 'des jours dus');
  assert.equal(r.faites, 1);
  assert.equal(r.pourcentage, Math.round((100 * r.faites) / r.jours));
});

test('Révisions des jours dus : rien n\'est dû le jour de la première réponse ; sans Question, mesure vide', () => {
  const vide = { jours: 0, faites: 0, pourcentage: null };
  assert.deepEqual(indicateurs([], periode).revisionsDesJoursDus, vide);
  assert.deepEqual(indicateurs([], { ...periode, lecons: [lecon([], [{ journal: [quiz(10)] }])] }).revisionsDesJoursDus, vide);
});

test('Révisions des jours dus : un jour dû sans réponse compte pour non fait, et aucun jour futur n\'est compté', () => {
  const r = indicateurs([], { ...periode, maintenant: a(6), lecons: [lecon([], [{ journal: [quiz(1, { juste: false })] }])] }).revisionsDesJoursDus;
  assert.equal(r.faites, 0);
  assert.ok(r.jours >= 1 && r.jours <= 5);
});
