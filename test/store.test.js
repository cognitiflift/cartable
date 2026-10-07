import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStore, rebondsProposes } from '../lib/store.js';

let dossier, store;

beforeEach(async () => {
  dossier = await fs.mkdtemp(path.join(os.tmpdir(), 'cartable-store-'));
  store = createStore(dossier);
  await store.creerEleve({ pseudo: 'Zoé', age: 10, niveau: 'Primaire 5' });
  // Le 4 octobre 2026 à 0 h 30, heure locale.
  mock.timers.enable({ apis: ['Date'], now: new Date(2026, 9, 4, 0, 30) });
});

afterEach(async () => {
  mock.timers.reset();
  await fs.rm(dossier, { recursive: true, force: true });
});

test('Leçon libre : identifiant date + sujet', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: 'Les volcans', mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-les-volcans');
});

test('Leçon libre : accents et ponctuation donnent un slug propre', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: "L'été à Noël !", mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-l-ete-a-noel');
});

test('Leçon libre : sujet vide une fois converti donne « lecon »', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: '🌋 ?!', mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-lecon');
});

test('Leçon libre : sujet très long tronqué sur un tiret, 60 caractères au plus, doublon compris', async () => {
  const sujet = 'Pourquoi les volcans entrent-ils en éruption et comment les scientifiques prévoient-ils les catastrophes ?';
  const premiere = await store.creerLecon('zoe', { sujet, mode: 'libre' });
  const seconde = await store.creerLecon('zoe', { sujet, mode: 'libre' });
  assert.equal(premiere.id, '2026-10-04-pourquoi-les-volcans-entrent-ils-en-eruption-et');
  assert.equal(seconde.id, '2026-10-04-pourquoi-les-volcans-entrent-ils-en-eruption-et-2');
  assert.equal(seconde.id.length, 60);
  assert.equal((await store.lireLecon('zoe', seconde.id)).sujet, sujet);
});

test('Leçon libre : un seul mot très long est coupé net', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: 'a'.repeat(80), mode: 'libre' });
  assert.equal(lecon.id, `2026-10-04-${'a'.repeat(49)}`);
});

test('Deux créations simultanées sur le même sujet visent deux dossiers distincts', async () => {
  const lecons = await Promise.all([1, 2, 3].map(() => store.creerLecon('zoe', { sujet: 'Les volcans', mode: 'libre' })));
  assert.deepEqual(lecons.map((l) => l.id).sort(), ['2026-10-04-les-volcans', '2026-10-04-les-volcans-2', '2026-10-04-les-volcans-3']);
});

test('La date est la date locale de création, pas la date UTC', async (t) => {
  const tz = process.env.TZ;
  t.after(() => (tz === undefined ? delete process.env.TZ : (process.env.TZ = tz)));
  // UTC+14 : le 4 octobre à 0 h 30 locale est encore le 3 octobre en UTC.
  process.env.TZ = 'Pacific/Kiritimati';
  mock.timers.setTime(new Date(2026, 9, 4, 0, 30).getTime());
  assert.equal((await store.creerLecon('zoe', { sujet: 'Matin', mode: 'libre' })).id, '2026-10-04-matin');
  // UTC−7 : le 4 octobre à 23 h 30 locale est déjà le 5 octobre en UTC.
  process.env.TZ = 'America/Los_Angeles';
  mock.timers.setTime(new Date(2026, 9, 4, 23, 30).getTime());
  assert.equal((await store.creerLecon('zoe', { sujet: 'Soir', mode: 'libre' })).id, '2026-10-04-soir');
});

test('Leçon libre : les ligatures sont développées (œ → oe, æ → ae)', async () => {
  const lecon = await store.creerLecon('zoe', { sujet: 'Le cœur et l’ex æquo', mode: 'libre' });
  assert.equal(lecon.id, '2026-10-04-le-coeur-et-l-ex-aequo');
});

test('Une Leçon existante à l\'ancien format l-… se liste, se lit et reçoit des scores', async () => {
  const dir = path.join(store.elevesDir, 'zoe', 'lecons', 'l-mutm4ihi');
  await fs.mkdir(path.join(dir, 'lessons'), { recursive: true });
  const etat = { id: 'l-mutm4ihi', sujet: 'Les fractions', mode: 'libre', sessionId: 's-1', creee: '2026-09-01T10:00:00.000Z', derniereActivite: '2026-09-01T10:00:00.000Z', messages: [], scores: [] };
  await fs.writeFile(path.join(dir, 'etat.json'), JSON.stringify(etat));
  await fs.writeFile(path.join(dir, 'lessons', '0001-fractions.html'), '<h1>Fractions</h1>');

  assert.deepEqual((await store.listerLecons('zoe')).map((l) => l.id), ['l-mutm4ihi']);
  assert.deepEqual((await store.lireLecon('zoe', 'l-mutm4ihi')).pages, ['0001-fractions.html']);
  await store.enregistrerScore('zoe', 'l-mutm4ihi', { score: 90 });
  assert.equal((await store.lireLecon('zoe', 'l-mutm4ihi')).maitrise.palier, 'acquis');
});

test('Leçon de révision : identifiant date + revision, suffixe -2 le même jour', async () => {
  const premiere = await store.creerLecon('zoe', { sujet: 'Révision', mode: 'revision' });
  const seconde = await store.creerLecon('zoe', { sujet: 'Révision', mode: 'revision' });
  assert.equal(premiere.id, '2026-10-04-revision');
  assert.equal(seconde.id, '2026-10-04-revision-2');
  assert.equal((await store.lireLecon('zoe', premiere.id)).mode, 'revision');
});

test('Nombre de Propositions : 4 par défaut, réglable de 2 à 10 à la création comme à la modification', async () => {
  assert.equal((await store.lireEleve('zoe')).nombrePropositions, 4);
  assert.equal((await store.creerEleve({ pseudo: 'Léo', age: 9, niveau: 'Primaire 4', nombrePropositions: 2 })).nombrePropositions, 2);
  assert.equal((await store.modifierProfil('zoe', { nombrePropositions: '10' })).nombrePropositions, 10);
  assert.equal((await store.modifierProfil('zoe', { age: 11 })).nombrePropositions, 10);
  for (const invalide of [1, 11, 3.5, 'beaucoup', '']) {
    await assert.rejects(store.modifierProfil('zoe', { nombrePropositions: invalide }), { status: 400, message: /Nombre de Propositions/ });
    await assert.rejects(store.creerEleve({ pseudo: 'Max', age: 9, niveau: 'Primaire 4', nombrePropositions: invalide }), { status: 400 });
  }
});

test('Nombre de Propositions : un Élève existant sans ce champ en a 4', async () => {
  const fichier = path.join(dossier, 'zoe', 'profil.json');
  const { nombrePropositions, ...ancien } = JSON.parse(await fs.readFile(fichier, 'utf8'));
  await fs.writeFile(fichier, JSON.stringify(ancien));
  assert.equal((await store.lireEleve('zoe')).nombrePropositions, 4);
});

test('Propositions : lecture coupée au nombre de l\'Élève, marque « au programme » lue en booléen', async () => {
  const propositions = ['A', 'B', 'C', 'D', 'E'].map((titre, i) => ({ titre, categorie: 'Sciences', accroche: '', type: 'original', auProgramme: [true, 'oui', undefined, false, true][i] }));
  await store.ecrirePropositions('zoe', propositions);
  assert.deepEqual((await store.lirePropositions('zoe')).map((p) => [p.titre, p.auProgramme]), [['A', true], ['B', false], ['C', false], ['D', false]]);
  await store.modifierProfil('zoe', { nombrePropositions: 2 });
  assert.deepEqual((await store.lirePropositions('zoe')).map((p) => p.titre), ['A', 'B']);
});

test('Historique des Propositions : vide au départ, les titres de chaque lot s\'ajoutent, 10 au plus, les plus anciens sortent', async () => {
  assert.deepEqual(await store.lireHistoriquePropositions('zoe'), []);
  await store.ajouterHistoriquePropositions('zoe', ['T1', 'T2', 'T3', 'T4']);
  assert.deepEqual(await store.lireHistoriquePropositions('zoe'), ['T1', 'T2', 'T3', 'T4']);
  await store.ajouterHistoriquePropositions('zoe', ['T5', 'T6', 'T7', 'T8']);
  await store.ajouterHistoriquePropositions('zoe', ['T9', 'T10', 'T11', 'T12']);
  assert.deepEqual(await store.lireHistoriquePropositions('zoe'), ['T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']);
  await assert.rejects(store.lireHistoriquePropositions('personne'), { status: 404 });
});

test('Rebonds proposés : aucun si le dernier message n\'est pas un Retour de quiz', () => {
  assert.deepEqual(rebondsProposes([]), []);
  assert.deepEqual(rebondsProposes([{ role: 'agent', texte: 'Bonjour !' }]), []);
  const retour = { role: 'agent', texte: 'Bravo', retourQuiz: { score: 90, action: 'suivante' } };
  assert.deepEqual(rebondsProposes([retour, { role: 'eleve', texte: '➡️ Je suis prêt pour la suite.' }, { role: 'agent', texte: 'Page prête' }]), []);
});

test('Rebonds proposés : déduits de l\'action du dernier Retour de quiz, Réviser après une Leçon terminée', () => {
  const apres = (action) => rebondsProposes([{ role: 'agent', texte: '…', retourQuiz: { score: 50, action } }]);
  assert.deepEqual(apres('revoir'), ['revoir']);
  assert.deepEqual(apres('defi'), ['defi']);
  assert.deepEqual(apres('suivante'), ['suivante']);
  assert.deepEqual(apres('terminee'), ['reviser']);
});
