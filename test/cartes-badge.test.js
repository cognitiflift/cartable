import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionsDeBadge, versionActiveBadge, ajouterVersionBadge, choisirVersionBadge, calquesBadgesActifs, vueParentBadges } from '../lib/cartes-badge.js';
import { FAMILLES, SURPRISES } from '../lib/badges.js';

const T0 = Date.parse('2026-11-12T10:00:00.000Z');
const CALQUES = { l1: '<svg/>', l2: '<svg/>', heros: '<svg/>' };

test('sans fichier ni entrée : la version 1, le dessin du code, est seule et active', () => {
  for (const f of [null, { cartes: {} }, { cartes: {}, badges: {} }]) {
    assert.deepEqual(versionsDeBadge(f, 'memoire'), [{ numero: 1, calques: null, creee: null, code: true }]);
    assert.equal(versionActiveBadge(f, 'memoire'), 1);
  }
});

test('ajouter une version : numéro suivant, version 1 gardée, active inchangée', () => {
  const f = ajouterVersionBadge({ cartes: {} }, 'memoire', CALQUES, T0);
  assert.deepEqual(versionsDeBadge(f, 'memoire').map((v) => v.numero), [1, 2]);
  assert.deepEqual(versionsDeBadge(f, 'memoire')[1], { numero: 2, calques: CALQUES, creee: '2026-11-12T10:00:00.000Z', code: false });
  assert.equal(versionActiveBadge(f, 'memoire'), 1);
  assert.equal(ajouterVersionBadge(f, 'memoire', null, T0), f);
  assert.deepEqual(versionsDeBadge(f, 'curieux').map((v) => v.numero), [1]);
});

test('choisir une version : choisie, deja, sans-version ; ne touche pas le reste du fichier', () => {
  const f = ajouterVersionBadge({ cartes: { a: { retourne: 'x' } }, paliers: { 'memoire/bronze': { retourne: null } } }, 'memoire', CALQUES, T0);
  const r = choisirVersionBadge(f, 'memoire', 2);
  assert.equal(r.statut, 'choisie');
  assert.equal(versionActiveBadge(r.fichier, 'memoire'), 2);
  assert.deepEqual(r.fichier.cartes, f.cartes);
  assert.deepEqual(r.fichier.paliers, f.paliers);
  assert.equal(choisirVersionBadge(r.fichier, 'memoire', 2).statut, 'deja');
  assert.equal(choisirVersionBadge(r.fichier, 'memoire', 2).fichier, r.fichier);
  assert.equal(choisirVersionBadge(r.fichier, 'memoire', 9).statut, 'sans-version');
  assert.equal(choisirVersionBadge(null, 'memoire', 2).statut, 'sans-version');
  const retour = choisirVersionBadge(r.fichier, 'memoire', 1);
  assert.equal(retour.statut, 'choisie');
  assert.equal(versionsDeBadge(retour.fichier, 'memoire').length, 2);
});

test('choisir la version 1 sans fichier : deja, sans rien créer', () => {
  const r = choisirVersionBadge(null, 'memoire', 1);
  assert.equal(r.statut, 'deja');
  assert.equal(r.fichier, null);
});

test('calquesBadgesActifs : seulement les versions dessinées par l’agent et actives', () => {
  let f = ajouterVersionBadge({ cartes: {} }, 'memoire', CALQUES, T0);
  assert.deepEqual(calquesBadgesActifs(f), {});
  f = choisirVersionBadge(f, 'memoire', 2).fichier;
  assert.deepEqual(calquesBadgesActifs(f), { memoire: CALQUES });
  assert.deepEqual(calquesBadgesActifs(null), {});
});

test('vue parent : toutes les Familles et surprises, surprises pas encore trouvées comprises', () => {
  const badges = { badges: { memoire: { bronze: { jour: '2026-11-01' }, argent: { jour: '2026-11-05' } }, 'content-de-te-revoir': { unique: { jour: '2026-11-03' } } } };
  const { badges: liste } = vueParentBadges(null, badges);
  assert.equal(liste.length, FAMILLES.length + SURPRISES.length);
  const memoire = liste.find((b) => b.id === 'memoire');
  assert.deepEqual(memoire.paliers, [{ palier: 'bronze', obtenu: true }, { palier: 'argent', obtenu: true }, { palier: 'or', obtenu: false }, { palier: 'diamant', obtenu: false }]);
  assert.equal(memoire.surprise, false);
  assert.equal(memoire.versionActive, 1);
  assert.equal(memoire.versions[0].active, true);
  assert.equal(liste.find((b) => b.id === 'jusquau-bout').paliers.length, 3);
  const revoir = liste.find((b) => b.id === 'content-de-te-revoir');
  assert.deepEqual([revoir.surprise, revoir.trouve, revoir.paliers], [true, true, [{ palier: 'unique', obtenu: true }]]);
  assert.equal(liste.find((b) => b.id === 'mois-complet').trouve, false);
});

test('vue parent : la version active et ses calques suivent le choix', () => {
  let f = ajouterVersionBadge({ cartes: {} }, 'curieux', CALQUES, T0);
  f = choisirVersionBadge(f, 'curieux', 2).fichier;
  const c = vueParentBadges(f, null).badges.find((b) => b.id === 'curieux');
  assert.equal(c.versionActive, 2);
  assert.deepEqual(c.versions.map((v) => [v.numero, v.active, v.code]), [[1, false, true], [2, true, false]]);
  assert.deepEqual(c.versions[1].calques, CALQUES);
});
