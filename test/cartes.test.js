import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fusionnerCartes, retournerCarte, commencerComposition, reprendreCompositions, aRetourner, vueCartes } from '../lib/cartes.js';

const T0 = Date.parse('2026-11-10T12:00:00.000Z');
const T1 = Date.parse('2026-11-11T12:00:00.000Z');
const T2 = Date.parse('2026-11-12T12:00:00.000Z');

// Une Leçon telle que lireLecon la renvoie, réduite à ce qui compte pour les cartes.
const lecon = (id, palier = 'bien en tête', champs = {}) => ({ id, titre: `Leçon ${id}`, categorie: 'Sciences', objectifs: [{}, {}, {}], maitrise: { pourcentage: 90, palier }, ...champs });
const badges = (paliers = {}) => ({ version: 1, badges: paliers });

test('premier calcul : les Leçons déjà Acquises sont écartées, aucune carte', () => {
  const { fichier, nouvelles } = fusionnerCartes(null, { lecons: [lecon('a', 'acquis'), lecon('b')], badges: badges(), maintenant: T0 });
  assert.deepEqual(fichier.ecartees, ['a']);
  assert.deepEqual(fichier.cartes, {});
  assert.deepEqual(nouvelles, []);
  assert.equal(fichier.livraison, '2026-11-10T12:00:00.000Z');
  assert.equal(fichier.son, false);
});

test('une Leçon qui passe à Acquise donne une carte « à composer », une seule fois', () => {
  const premier = fusionnerCartes(null, { lecons: [lecon('b')], badges: badges(), maintenant: T0 }).fichier;
  const { fichier, nouvelles } = fusionnerCartes(premier, { lecons: [lecon('b', 'acquis', { titre: 'Les volcans' })], badges: badges(), maintenant: T1 });
  assert.deepEqual(nouvelles, ['b']);
  assert.deepEqual(fichier.cartes.b, {
    lecon: 'b', titre: 'Les volcans', categorie: 'Sciences', objectifs: 3, jourAcquisition: '2026-11-11',
    etat: 'a-composer', essais: 0, calques: null, prete: null, retourne: null,
  });
  const encore = fusionnerCartes(fichier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T2 });
  assert.deepEqual(encore.nouvelles, []);
  assert.equal(encore.fichier, fichier); // rien de nouveau : le même fichier, à ne pas réécrire
});

test('la carte reste quand la Leçon redescend ou est supprimée, et ne se refait pas', () => {
  const premier = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  const avec = fusionnerCartes(premier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  const redescendue = fusionnerCartes(avec, { lecons: [lecon('b', 'à consolider')], badges: badges(), maintenant: T2 });
  assert.equal(redescendue.fichier.cartes.b.lecon, 'b');
  const supprimee = fusionnerCartes(redescendue.fichier, { lecons: [], badges: badges(), maintenant: T2 });
  assert.equal(supprimee.fichier.cartes.b.titre, 'Leçon b');
  const reacquise = fusionnerCartes(supprimee.fichier, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T2 });
  assert.deepEqual(reacquise.nouvelles, []);
});

test('une Leçon écartée à la livraison ne donne jamais de carte, même après être redescendue puis redevenue Acquise', () => {
  let { fichier } = fusionnerCartes(null, { lecons: [lecon('a', 'acquis')], badges: badges(), maintenant: T0 });
  ({ fichier } = fusionnerCartes(fichier, { lecons: [lecon('a', 'à revoir')], badges: badges(), maintenant: T1 }));
  const fin = fusionnerCartes(fichier, { lecons: [lecon('a', 'acquis')], badges: badges(), maintenant: T2 });
  assert.deepEqual(fin.nouvelles, []);
  assert.deepEqual(fin.fichier.cartes, {});
});

test('essais comptés, deux au plus ; une composition interrompue redevient « à composer »', () => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  f = commencerComposition(f, 'b');
  assert.deepEqual([f.cartes.b.etat, f.cartes.b.essais], ['en-composition', 1]);
  f = reprendreCompositions(f);
  assert.deepEqual([f.cartes.b.etat, f.cartes.b.essais], ['a-composer', 1]);
  f = commencerComposition(f, 'b');
  assert.equal(f.cartes.b.essais, 2);
  f = reprendreCompositions(f);
  assert.equal(commencerComposition(f, 'b'), f); // pas de troisième essai
  assert.equal(reprendreCompositions(f), f);
});

test('Paliers : ceux d\'avant la livraison sont visibles d\'emblée, les suivants sont à retourner, retournement idempotent', () => {
  const avant = badges({ regulier: { bronze: { jour: '2026-11-01', ajoute: '2026-11-01T10:00:00.000Z' } } });
  let { fichier } = fusionnerCartes(null, { lecons: [], badges: avant, maintenant: T0 });
  assert.deepEqual(aRetourner(fichier), []);
  const apres = badges({ regulier: { bronze: avant.badges.regulier.bronze, argent: { jour: '2026-11-11', ajoute: '2026-11-11T09:00:00.000Z' } } });
  ({ fichier } = fusionnerCartes(fichier, { lecons: [], badges: apres, maintenant: T1 }));
  assert.deepEqual(aRetourner(fichier), [{ type: 'palier', id: 'regulier', palier: 'argent' }]);
  const r = retournerCarte(fichier, { type: 'palier', id: 'regulier', palier: 'argent' }, T2);
  assert.equal(r.statut, 'retournee');
  assert.deepEqual(aRetourner(r.fichier), []);
  const encore = retournerCarte(r.fichier, { type: 'palier', id: 'regulier', palier: 'argent' }, T2 + 5000);
  assert.equal(encore.statut, 'deja');
  assert.equal(encore.fichier, r.fichier);
  assert.equal(retournerCarte(fichier, { type: 'palier', id: 'regulier', palier: 'or' }, T2).statut, 'introuvable');
});

test('carte de ligne : à retourner seulement une fois prête ou générique ; retournement idempotent', () => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('b', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  assert.deepEqual(aRetourner(f), []);
  assert.equal(retournerCarte(f, { type: 'ligne', id: 'b' }, T2).statut, 'pas-prete');
  f = { ...f, cartes: { b: { ...f.cartes.b, etat: 'prete', prete: '2026-11-11T12:01:00.000Z' } } };
  assert.deepEqual(aRetourner(f), [{ type: 'ligne', id: 'b' }]);
  const r = retournerCarte(f, { type: 'ligne', id: 'b' }, T2);
  assert.equal(r.fichier.cartes.b.retourne, '2026-11-12T12:00:00.000Z');
  assert.equal(retournerCarte(r.fichier, { type: 'ligne', id: 'b' }, T2 + 1).fichier, r.fichier);
});

test('vueCartes : fichier absent, réponse valide', () => {
  assert.deepEqual(vueCartes(null), { cartesLigne: [], aRetourner: [], son: false });
});

test('vueCartes : cartes de ligne de la plus récente à la plus ancienne', () => {
  let f = fusionnerCartes(null, { lecons: [], badges: badges(), maintenant: T0 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('a', 'acquis')], badges: badges(), maintenant: T1 }).fichier;
  f = fusionnerCartes(f, { lecons: [lecon('a', 'acquis'), lecon('b', 'acquis')], badges: badges(), maintenant: T2 }).fichier;
  assert.deepEqual(vueCartes(f).cartesLigne.map((c) => c.lecon), ['b', 'a']);
});
