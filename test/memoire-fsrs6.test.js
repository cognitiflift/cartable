import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoireDeQuestion, etatMemoire, probabiliteDeRappel, PARAMETRES_FSRS6, comparerPlanificateurs, SEUIL_REPONSES } from '../lib/memoire.js';

const JOUR = 86_400_000;
const DEBUT = Date.parse('2026-10-01T10:00:00Z');
const a = (jour) => DEBUT + jour * JOUR;
const le = (jour, juste, extra = {}) => ({ date: new Date(a(jour)).toISOString(), juste, origine: 'quiz', ...extra });
const rev = (jour, juste) => le(jour, juste, { origine: 'revision' });

// FSRS-6 (#161) : valeurs de référence calculées avec py-fsrs 6.3.2 (Scheduler sans fuzz, paramètres par défaut),
// réponses « bien » à J0 et J0,5 (même jour), « difficile » à J2,5, « à revoir » à J7,5, « bien » à J8,5 et J12,5.
test('FSRS-6 : 21 paramètres par défaut et valeurs de référence de py-fsrs', () => {
  assert.equal(PARAMETRES_FSRS6.length, 21);
  const journal = [le(0, true), le(0.5, true), le(2.5, true, { sur: false }), le(7.5, false), le(8.5, true), le(12.5, true)];
  const attendu = [
    [1, 2.3065, 2.118103970459016], [2, 2.3065, 2.111214235785395], [3, 7.517359325415191, 4.748284761594571],
    [4, 1.1527006911534028, 8.259025282096594], [5, 2.6520760101554193, 8.245994626111335], [6, 7.075302513036296, 8.23297700078206],
  ];
  for (const [n, stabilite, difficulte] of attendu) {
    const etat = etatMemoire(journal.slice(0, n), 'fsrs6');
    assert.ok(Math.abs(etat.stabilite - stabilite) < 1e-9, `stabilité ${n}`);
    assert.ok(Math.abs(etat.difficulte - difficulte) < 1e-9, `difficulté ${n}`);
  }
  assert.ok(Math.abs(probabiliteDeRappel(3, 7.075302513036296, 'fsrs6') - 0.9478100971047686) < 1e-9);
});

test('FSRS-6 : la rétention vaut 90 % après une stabilité, le planificateur par défaut reste FSRS-5', () => {
  assert.ok(Math.abs(probabiliteDeRappel(5, 5, 'fsrs6') - 0.9) < 1e-12);
  assert.equal(etatMemoire([le(0, true)]).stabilite, 3.173);
  assert.equal(memoireDeQuestion([le(0, true)], { maintenant: a(0), planificateur: 'fsrs6' }).stabilite, 2.3065);
  assert.equal(memoireDeQuestion([le(0, true)], { maintenant: a(0), planificateur: 'fsrs6' }).prochaineRevision, '2026-10-03T10:00:00.000Z');
});

test('Perte logarithmique : sur les seules réponses de Révision du jour qui suivent une réponse', () => {
  const c = comparerPlanificateurs([[le(0, true), rev(3, true), le(10, false)], [rev(0, true)]]);
  assert.equal(c.reponses, 1);
  assert.ok(Math.abs(c.fsrs5.perte - -Math.log(probabiliteDeRappel(3, 3.173, 'fsrs5'))) < 1e-12);
  assert.ok(Math.abs(c.fsrs6.perte - -Math.log(probabiliteDeRappel(3, 2.3065, 'fsrs6'))) < 1e-12);
});

test('Planificateur choisi : FSRS-5 sans assez de réponses, même si FSRS-6 prédit mieux', () => {
  const c = comparerPlanificateurs(Array.from({ length: SEUIL_REPONSES - 1 }, () => [le(0, true), rev(30, true)]));
  assert.equal(c.reponses, SEUIL_REPONSES - 1);
  assert.ok(c.fsrs6.perte < c.fsrs5.perte);
  assert.equal(c.choisi, 'fsrs5');
});

test('Planificateur choisi : FSRS-6 dès le seuil de réponses s’il prédit mieux, FSRS-5 sinon', () => {
  // 30 jours après une première réponse juste, FSRS-6 prédit 67 % de rappel, FSRS-5 56 %.
  const justes = comparerPlanificateurs(Array.from({ length: SEUIL_REPONSES }, () => [le(0, true), rev(30, true)]));
  assert.equal(justes.choisi, 'fsrs6');
  const faux = comparerPlanificateurs(Array.from({ length: SEUIL_REPONSES }, () => [le(0, true), rev(30, false)]));
  assert.ok(faux.fsrs5.perte < faux.fsrs6.perte);
  assert.equal(faux.choisi, 'fsrs5');
});
