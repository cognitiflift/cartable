import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionsDeBadge, versionActiveBadge, ajouterVersionBadge, choisirVersionBadge, calquesBadgesActifs, vueParentBadges, demanderRegenerationBadge, prochainBadgeARegenerer, commencerRegenerationBadge, terminerRegenerationBadge, echouerRegenerationBadge, reprendreRegenerationsBadge, ajouterCoutBadge } from '../lib/cartes-badge.js';
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

// Régénération (#239) : demandée → en cours → version ajoutée, ou deux essais ratés → abandon, version active inchangée.
const regen = (f, id) => f?.badges?.[id]?.regeneration;
test('régénération : demander, commencer, terminer ajoute une version sans changer l’active', () => {
  const d = demanderRegenerationBadge(null, 'memoire');
  assert.equal(d.statut, 'demandee');
  assert.deepEqual(regen(d.fichier, 'memoire'), { etat: 'demandee', essais: 0 });
  assert.equal(prochainBadgeARegenerer(d.fichier), 'memoire');
  assert.equal(demanderRegenerationBadge(d.fichier, 'memoire').statut, 'deja');
  assert.equal(demanderRegenerationBadge(d.fichier, 'memoire').fichier, d.fichier);
  const c = commencerRegenerationBadge(d.fichier, 'memoire');
  assert.deepEqual(regen(c, 'memoire'), { etat: 'en-cours', essais: 1 });
  assert.equal(prochainBadgeARegenerer(c), null);
  assert.equal(commencerRegenerationBadge(c, 'memoire'), c, 'sans effet hors « demandée »');
  const f = terminerRegenerationBadge(c, 'memoire', CALQUES, T0);
  assert.equal(regen(f, 'memoire'), undefined);
  assert.deepEqual(versionsDeBadge(f, 'memoire').map((v) => v.numero), [1, 2]);
  assert.equal(versionActiveBadge(f, 'memoire'), 1);
  assert.equal(terminerRegenerationBadge(f, 'memoire', CALQUES, T0), f, 'sans effet sans régénération en cours');
});

test('régénération : deux essais ratés, abandon averti, versions et active inchangées ; une demande suivante efface l’avertissement', () => {
  let f = choisirVersionBadge(ajouterVersionBadge(null, 'curieux', CALQUES, T0), 'curieux', 2).fichier;
  f = commencerRegenerationBadge(demanderRegenerationBadge(f, 'curieux').fichier, 'curieux');
  f = echouerRegenerationBadge(f, 'curieux', T0);
  assert.deepEqual(regen(f, 'curieux'), { etat: 'demandee', essais: 1 }, 'un essai de plus');
  f = echouerRegenerationBadge(commencerRegenerationBadge(f, 'curieux'), 'curieux', T0);
  assert.equal(regen(f, 'curieux'), undefined);
  assert.equal(f.badges.curieux.echecRegeneration, '2026-11-12T10:00:00.000Z');
  assert.deepEqual([versionsDeBadge(f, 'curieux').length, versionActiveBadge(f, 'curieux')], [2, 2]);
  assert.equal(vueParentBadges(f, null).badges.find((b) => b.id === 'curieux').echecRegeneration, true);
  assert.equal(demanderRegenerationBadge(f, 'curieux').fichier.badges.curieux.echecRegeneration, undefined);
  assert.equal(echouerRegenerationBadge(f, 'curieux', T0), f, 'sans effet sans régénération en cours');
});

test('régénération : ajouter une version ou en choisir une garde la demande et le coût', () => {
  let f = ajouterCoutBadge(demanderRegenerationBadge(null, 'memoire').fichier, 'memoire', { tache: 'carteBadge', coutUsd: 0.5 }, T0);
  f = choisirVersionBadge(ajouterVersionBadge(f, 'memoire', CALQUES, T0), 'memoire', 2).fichier;
  assert.deepEqual(regen(f, 'memoire'), { etat: 'demandee', essais: 0 });
  assert.equal(f.badges.memoire.couts.length, 1);
});

test('régénération : au redémarrage, un tour interrompu redevient demandé', () => {
  const f = commencerRegenerationBadge(demanderRegenerationBadge(null, 'memoire').fichier, 'memoire');
  assert.deepEqual(regen(reprendreRegenerationsBadge(f), 'memoire'), { etat: 'demandee', essais: 1 });
  const sans = { cartes: {}, badges: {} };
  assert.equal(reprendreRegenerationsBadge(sans), sans);
  assert.equal(reprendreRegenerationsBadge(null), null);
});

test('coût des cartes de Badge : chaque tour est gardé avec le badge et résumé dans la vue parent', () => {
  let f = ajouterCoutBadge(null, 'memoire', { tache: 'carteBadge', coutUsd: 0.25 }, T0);
  f = ajouterCoutBadge(f, 'memoire', { tache: 'carteBadge', coutUsd: 0.5 }, T0);
  assert.equal(ajouterCoutBadge(f, 'memoire', { tache: 'carteBadge' }, T0), f, 'sans coût connu : rien');
  assert.deepEqual(f.badges.memoire.couts.map((c) => c.coutUsd), [0.25, 0.5]);
  const b = vueParentBadges(f, null).badges;
  assert.deepEqual(b.find((x) => x.id === 'memoire').cout, { coutUsd: 0.75, tours: 2 });
  assert.deepEqual(b.find((x) => x.id === 'curieux').cout, { coutUsd: 0, tours: 0 });
  assert.equal(b.find((x) => x.id === 'memoire').regeneration, false);
});

test('un ancien fichier de cartes sans clé badges se lit et se complète sans migration, le reste intact', () => {
  const ancien = { version: 1, livraison: '2026-09-30T10:00:00.000Z', son: true, ecartees: ['a'], cartes: { x: { lecon: 'x' } }, paliers: { 'memoire/bronze': { retourne: null } } };
  assert.equal(versionActiveBadge(ancien, 'memoire'), 1);
  assert.deepEqual(calquesBadgesActifs(ancien), {});
  assert.equal(vueParentBadges(ancien, null).badges.find((b) => b.id === 'memoire').regeneration, false);
  assert.equal(reprendreRegenerationsBadge(ancien), ancien);
  const { fichier, statut } = demanderRegenerationBadge(ancien, 'memoire');
  assert.equal(statut, 'demandee');
  assert.deepEqual({ ...fichier, badges: undefined }, { ...ancien, badges: undefined });
  assert.deepEqual(fichier.badges.memoire.regeneration, { etat: 'demandee', essais: 0 });
});

test('demander sans fichier de cartes : un fichier sans livraison est créé, la régénération est demandée', () => {
  const { fichier, statut } = demanderRegenerationBadge(null, 'memoire');
  assert.deepEqual([statut, fichier.livraison, prochainBadgeARegenerer(fichier)], ['demandee', null, 'memoire']);
});
