import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerBadges, niveauxFranchis, SURPRISES } from '../lib/badges.js';

// Badges surprise du groupe « Mémoire et progression » (#220) : première fois, à partir de `depuis` (2026-11-11), sans
// rétroactivité. Dates en heure locale, comme les jours de l'Élève (voir lib/jour.js).
const a = (jour, heure = 12) => { const [an, mois, j] = jour.split('-').map(Number); return new Date(an, mois - 1, j, heure).getTime(); };
const iso = (jour, heure) => new Date(a(jour, heure)).toISOString();
const lecon = (champs = {}) => ({ id: 'l', mode: 'libre', categorie: 'Sciences', creee: iso('2026-09-01'), terminee: null, objectifs: [], scores: [], questions: [], ...champs });
const question = (id, reponses) => ({ id, page: '0002-p.html', contenu: { objectifs: [1] },
  journal: reponses.map(([jour, juste, marques = {}, heure = 12]) => ({ date: iso(jour, heure), juste, origine: 'quiz', ...marques })) });
const surprise = (id, contexte = {}) => calculerBadges({ lecons: [], evenements: [], maintenant: a('2028-12-31'), ...contexte, ...(contexte.maintenant && { maintenant: a(contexte.maintenant) }) })
  .find((b) => b.id === id).paliers;
const unique = (jour) => [{ palier: 'unique', jour }];
// Une Leçon à un Objectif, couvert par une Question : Retenu dès la deuxième réponse juste (un jour plus tard).
const leconRetenue = (reponses) => lecon({
  objectifs: [{ texte: 'O1', atteint: true, retenu: true }],
  scores: [{ score: 100, date: iso(reponses[0][0], 10), page: '0002-p.html', objectifs: [1] }],
  questions: [question('q', reponses)],
});
const niveau = (n, jour, id = 'a') => ({ type: 'niveau-atteint', date: iso(jour), lecon: id, niveau: n });

test('Surprises Mémoire et progression : chacune a `depuis` et une phrase sans score', () => {
  for (const id of ['terminus', 'haut-niveau', 'sommet', 'ca-tient-bon', 'remis-sur-les-rails', 'idee-corrigee', 'a-l-heure']) {
    const s = SURPRISES.find((x) => x.id === id);
    assert.equal(s?.depuis, '2026-11-11', id);
    assert.ok(s.phrase && !/%|score/i.test(s.phrase), id);
  }
});

test('🚉 Terminus : une Leçon devenue Acquise après la livraison des cartes, datée du jour de l\'acquisition', () => {
  const acquise = lecon({ id: 'a', maitrise: { pourcentage: 90, palier: 'acquis' } });
  const cartes = { livraison: iso('2026-11-05'), ecartees: [], cartes: { a: { lecon: 'a', jourAcquisition: '2026-11-20' } } };
  assert.deepEqual(surprise('terminus', { lecons: [acquise], cartes }), unique('2026-11-20'));
  // Pas encore enregistrée dans les cartes : c'est le jour du calcul.
  assert.deepEqual(surprise('terminus', { lecons: [acquise], cartes: { ...cartes, cartes: {} }, maintenant: '2026-11-21' }), unique('2026-11-21'));
});

test('🚉 Terminus : ni sans livraison des cartes, ni pour une Leçon écartée, ni avant `depuis`, ni sans Leçon Acquise', () => {
  const acquise = lecon({ id: 'a', maitrise: { pourcentage: 90, palier: 'acquis' } });
  assert.deepEqual(surprise('terminus', { lecons: [acquise], cartes: { livraison: iso('2026-11-05'), ecartees: ['a'], cartes: {} } }), []);
  assert.deepEqual(surprise('terminus', { lecons: [acquise], cartes: null }), []);
  assert.deepEqual(surprise('terminus', { lecons: [acquise] }), []);
  const avant = { livraison: iso('2026-11-05'), ecartees: [], cartes: { a: { jourAcquisition: '2026-11-10' } } };
  assert.deepEqual(surprise('terminus', { lecons: [acquise], cartes: avant }), []);
  assert.deepEqual(surprise('terminus', { lecons: [lecon({ id: 'b', maitrise: { pourcentage: 90, palier: 'bien en tête' } })], cartes: { ...avant, cartes: {} } }), []);
});

test('🏔️ Haut niveau et 🌋 Sommet : deux badges distincts, d\'après l\'événement `niveau-atteint`, datés du jour', () => {
  const evenements = [niveau(5, '2026-11-20'), niveau(10, '2026-12-03'), niveau(5, '2026-11-15', 'b')];
  assert.deepEqual(surprise('haut-niveau', { evenements }), unique('2026-11-15'));
  assert.deepEqual(surprise('sommet', { evenements }), unique('2026-12-03'));
  // Un saut de 4 à 10 note les deux niveaux le même jour : les deux badges tombent.
  const saut = [niveau(5, '2026-11-20'), niveau(10, '2026-11-20')];
  assert.deepEqual([surprise('haut-niveau', { evenements: saut }), surprise('sommet', { evenements: saut })], [unique('2026-11-20'), unique('2026-11-20')]);
});

test('🏔️ 🌋 Niveau : rien avant `depuis`, rien sans événement (Niveau 4, Leçon déjà au Niveau 7)', () => {
  assert.deepEqual(surprise('haut-niveau', { evenements: [niveau(5, '2026-11-10')] }), []);
  assert.deepEqual(surprise('sommet', { evenements: [niveau(5, '2026-11-20')] }), []);
  assert.deepEqual(surprise('haut-niveau', { evenements: [niveau(4, '2026-11-20')] }), []);
  assert.deepEqual(surprise('haut-niveau', { lecons: [lecon({ niveauLecon: 7 })] }), []);
});

test('niveauxFranchis : les seuils 5 et 10 franchis, une seule fois par Leçon, même si le niveau baisse puis remonte', () => {
  assert.deepEqual(niveauxFranchis(4, 5, [], 'a'), [5]);
  assert.deepEqual(niveauxFranchis(4, 10, [], 'a'), [5, 10]);
  assert.deepEqual(niveauxFranchis(1, 4, [], 'a'), []);
  assert.deepEqual(niveauxFranchis(5, 6, [], 'a'), []);
  assert.deepEqual(niveauxFranchis(null, 5, [], 'a'), [5]);
  assert.deepEqual(niveauxFranchis(4, 5, [niveau(5, '2026-11-20', 'a')], 'a'), []);
  assert.deepEqual(niveauxFranchis(4, 10, [niveau(5, '2026-11-20', 'a')], 'a'), [10]);
  assert.deepEqual(niveauxFranchis(4, 5, [niveau(5, '2026-11-20', 'autre')], 'a'), [5]);
});

test('🏗️ Ça tient bon : un Objectif Retenu l\'est encore 30 jours plus tard, daté de ce 30e jour', () => {
  const l = leconRetenue([['2026-12-01', true], ['2026-12-02', true]]); // Retenu le 2 décembre
  assert.deepEqual(surprise('ca-tient-bon', { lecons: [l], maintenant: '2027-01-01' }), unique('2027-01-01'));
});

test('🏗️ Ça tient bon : pas à 29 jours, pas s\'il a été oublié avant, pas avant `depuis`', () => {
  const l = leconRetenue([['2026-12-01', true], ['2026-12-02', true]]);
  assert.deepEqual(surprise('ca-tient-bon', { lecons: [l], maintenant: '2026-12-31' }), []); // 29 jours
  const oublie = leconRetenue([['2026-12-01', true], ['2026-12-02', true], ['2026-12-20', false]]);
  assert.deepEqual(surprise('ca-tient-bon', { lecons: [oublie], maintenant: '2027-02-01' }), []);
  const ancien = leconRetenue([['2026-09-01', true], ['2026-09-02', true]]); // 30 jours le 2 octobre : avant la livraison
  assert.deepEqual(surprise('ca-tient-bon', { lecons: [ancien] }), []);
});

test('🏗️ Ça tient bon : le Retenu ne décroît pas avec le temps seul (il suit les réponses) ; un an sans réponse, le badge tient', () => {
  const l = leconRetenue([['2026-12-01', true], ['2026-12-02', true]]);
  assert.deepEqual(surprise('ca-tient-bon', { lecons: [l], maintenant: '2027-12-01' }), unique('2027-01-01'));
});

test('🛤️ Remis sur les rails : un Objectif oublié redevient Retenu, daté du jour où il l\'est de nouveau', () => {
  const l = leconRetenue([['2026-12-01', true], ['2026-12-02', true], ['2027-02-01', false], ['2027-02-02', true]]);
  assert.deepEqual(surprise('remis-sur-les-rails', { lecons: [l] }), unique('2027-02-02'));
});

test('🛤️ Remis sur les rails : pas pour un Objectif jamais oublié, ni avant `depuis`', () => {
  const sans = leconRetenue([['2026-12-01', true], ['2026-12-02', true], ['2026-12-20', true]]);
  assert.deepEqual(surprise('remis-sur-les-rails', { lecons: [sans] }), []);
  const ancien = leconRetenue([['2026-08-01', true], ['2026-08-02', true], ['2026-09-01', false], ['2026-09-02', true]]);
  assert.deepEqual(surprise('remis-sur-les-rails', { lecons: [ancien] }), []);
});

test('💡 Idée corrigée : une réponse fausse « sûr », réussie un autre jour, datée de la réussite ; une fois par Question', () => {
  const q1 = question('q1', [['2026-11-15', false, { sur: true }], ['2026-11-18', true], ['2026-11-25', true]]);
  const q2 = question('q2', [['2026-11-14', false, { sur: true }], ['2026-11-16', true]]);
  assert.deepEqual(surprise('idee-corrigee', { lecons: [lecon({ questions: [q1, q2] })] }), unique('2026-11-16'));
});

test('💡 Idée corrigée : pas le même jour, ni « pas sûr », ni « Je ne sais pas », ni avant `depuis`', () => {
  const memeJour = question('a', [['2026-11-15', false, { sur: true }, 9], ['2026-11-15', true, {}, 18]]);
  const pasSur = question('b', [['2026-11-15', false, { sur: false }], ['2026-11-16', true]]);
  const nsp = question('c', [['2026-11-15', false, { jeNeSaisPas: true }], ['2026-11-16', true]]);
  const ancienne = question('d', [['2026-11-02', false, { sur: true }], ['2026-11-05', true]]);
  const pasEncore = question('e', [['2026-11-15', false, { sur: true }], ['2026-11-16', false]]);
  assert.deepEqual(surprise('idee-corrigee', { lecons: [lecon({ questions: [memeJour, pasSur, nsp, ancienne, pasEncore] })] }), []);
});

test('⏰ À l\'heure : une Leçon de révision terminée avant sa date de contrôle, datée de sa fin', () => {
  const l = lecon({ id: 'r', mode: 'revision', dateControle: '2026-12-10', terminee: iso('2026-12-05') });
  assert.deepEqual(surprise('a-l-heure', { lecons: [l] }), unique('2026-12-05'));
});

test('⏰ À l\'heure : pas le jour du contrôle ni après, sans date de contrôle, ni Leçon libre, ni avant `depuis`', () => {
  const r = (champs) => lecon({ id: 'r', mode: 'revision', dateControle: '2026-12-10', terminee: iso('2026-12-05'), ...champs });
  assert.deepEqual(surprise('a-l-heure', { lecons: [r({ terminee: iso('2026-12-10') }), r({ terminee: iso('2026-12-12') })] }), []);
  assert.deepEqual(surprise('a-l-heure', { lecons: [r({ dateControle: null }), r({ mode: 'libre' }), r({ terminee: null })] }), []);
  assert.deepEqual(surprise('a-l-heure', { lecons: [r({ dateControle: '2026-11-10', terminee: iso('2026-11-05') })] }), []);
});
