import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pagePrevue, preparationUtilisable, bilanPreparations } from '../lib/preparation.js';
import { consignePreparation } from '../lib/agent.js';

const quiz = { objectifs: [1], questions: [] };
// Leçon lue dont la page 0002 est affichée, son quiz pas encore fait.
const lecon = (champs = {}) => ({
  mode: 'libre', pages: ['0001-devine.html', '0002-page.html'], scores: [], quizEnAttente: true, rebondsProposes: [],
  objectifs: [{ texte: 'Nommer', atteint: false }], defiEnCours: false, reviserEnCours: false, ...champs,
});
const score = (valeur, page = '0001-page.html', autres = {}) => ({ score: valeur, page, date: '2026-10-01T10:00:00Z', ...autres });

test('Prévision : Étape suivante en Leçon libre, supposée réussie', () => {
  assert.deepEqual(pagePrevue(lecon(), quiz), { action: 'suivante', reussi: true, page: '0002-page.html' });
  assert.deepEqual(pagePrevue(lecon({ scores: [score(20)] }), quiz), { action: 'suivante', reussi: true, page: '0002-page.html' });
});

test('Prévision en révision : Défi si le dernier vrai quiz est réussi, sinon Revoir (sans vrai quiz, Revoir)', () => {
  const revision = (scores) => pagePrevue(lecon({ mode: 'revision', scores }), quiz);
  assert.deepEqual(revision([score(90)]), { action: 'defi', reussi: true, page: '0002-page.html' });
  assert.deepEqual(revision([score(90), score(60)]), { action: 'revoir', reussi: false, page: '0002-page.html' });
  assert.deepEqual(revision([score(100, '0001-devine.html', { pretest: true })]), { action: 'revoir', reussi: false, page: '0002-page.html' });
  // Leçon libre qu'on Révise : comme une révision.
  assert.equal(pagePrevue(lecon({ reviserEnCours: true, scores: [score(50)] }), quiz).action, 'revoir');
});

test('Rien à préparer : Pré-test, page sans quiz du Kit, quiz déjà fait, Défi qui terminerait la révision, mission à élargir', () => {
  assert.equal(pagePrevue(lecon(), { ...quiz, pretest: true }), null);
  assert.equal(pagePrevue(lecon(), null), null);
  assert.equal(pagePrevue(lecon({ quizEnAttente: false }), quiz), null);
  assert.equal(pagePrevue(lecon({ rebondsProposes: ['suivante'] }), quiz), null);
  assert.equal(pagePrevue(lecon({ mode: 'revision', defiEnCours: true, scores: [score(90)] }), quiz), null);
  assert.equal(pagePrevue(lecon({ objectifs: [{ texte: 'Nommer', atteint: true }] }), quiz), null);
});

test('Page préparée utilisable : même Rebond, quiz de la page prévue réussi ou raté comme prévu', () => {
  const prevue = { action: 'suivante', reussi: true, page: '0002-page.html' };
  const apres = (valeur, autres) => lecon({ quizEnAttente: false, rebondsProposes: ['suivante'], scores: [score(valeur, '0002-page.html', autres)] });
  assert.equal(preparationUtilisable(prevue, 'suivante', apres(80)), true);
  assert.equal(preparationUtilisable(prevue, 'suivante', apres(79)), false); // la page doit reprendre ses erreurs
  assert.equal(preparationUtilisable(prevue, 'reviser', apres(90)), false);
  assert.equal(preparationUtilisable(prevue, 'suivante', lecon({ scores: [score(90, '0001-page.html')] })), false);
  assert.equal(preparationUtilisable(prevue, 'suivante', apres(90, { pretest: true })), false);
  // Ce quiz a atteint tous les Objectifs : le prof doit d'abord proposer d'élargir la mission.
  assert.equal(preparationUtilisable(prevue, 'suivante', { ...apres(90), objectifs: [{ texte: 'Nommer', atteint: true }] }), false);
  assert.equal(preparationUtilisable(null, 'suivante', apres(90)), false);

  const revoir = { action: 'revoir', reussi: false, page: '0002-page.html' };
  assert.equal(preparationUtilisable(revoir, 'revoir', { ...apres(40), mode: 'revision' }), true);
  assert.equal(preparationUtilisable(revoir, 'defi', { ...apres(90), mode: 'revision' }), false);
});

test('Bilan des pages préparées : taux d\'inutilisation, suspension au-delà du seuil sur les 14 derniers jours', () => {
  const maintenant = Date.parse('2026-10-15T12:00:00Z');
  const issue = (jour, utilisee) => ({ date: `2026-10-${String(jour).padStart(2, '0')}T10:00:00Z`, utilisee });
  assert.deepEqual(bilanPreparations([], maintenant), { suspendue: false, utilisees: 0, inutilisees: 0, tauxInutilisation: null });
  // 4 inutilisées sur 6 récentes : plus de la moitié, suspendue.
  const recentes = [issue(10, false), issue(11, false), issue(12, true), issue(13, false), issue(14, true), issue(15, false)];
  assert.deepEqual(bilanPreparations(recentes, maintenant), { suspendue: true, utilisees: 2, inutilisees: 4, tauxInutilisation: 67 });
  // Exactement la moitié : pas au-delà du seuil.
  assert.equal(bilanPreparations([...recentes.slice(0, 5), issue(15, true)], maintenant).suspendue, false);
  // Trop peu de pages pour juger.
  assert.equal(bilanPreparations(recentes.slice(0, 5).map((p) => ({ ...p, utilisee: false })), maintenant).suspendue, false);
  // Les mêmes pages, vieilles de plus de 14 jours : la préparation reprend, le taux reste exposé.
  const anciennes = recentes.map((p) => ({ ...p, date: p.date.replace('2026-10', '2026-09') }));
  assert.deepEqual(bilanPreparations(anciennes, maintenant), { suspendue: false, utilisees: 2, inutilisees: 4, tauxInutilisation: 67 });
});

test('Consigne d\'une page préparée : celle du Rebond prévu, sans résultats du quiz, avec la supposition', () => {
  const consigne = consignePreparation({ action: 'revoir', reussi: false, page: '0002-page.html' }, { mode: 'revision', scores: [] });
  assert.match(consigne, /\[Rebond : Revoir\.\]/);
  assert.match(consigne, /quiz de 0002-page\.html/);
  assert.match(consigne, /en rate une partie/);
  assert.doesNotMatch(consigne, /Résultats du dernier quiz/);
  assert.match(consignePreparation({ action: 'defi', reussi: true, page: '0003-page.html' }, { mode: 'revision' }), /\[Rebond : Défi\.\][\s\S]*qu'il le réussit/);
});
