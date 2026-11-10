import test from 'node:test';
import assert from 'node:assert/strict';
import { reglerSon } from '../lib/cartes.js';
import { badgeAuPalier, collectionRangee, nouvellesCartes, cartesLigneRangees, contientNouveau, emplacementCarte } from '../public/nouvelles-cartes.js';
import { notesCarillon } from '../public/carillon.js';

const PAL = ['bronze', 'argent', 'or', 'diamant'];
const famille = (jusqua, id = 'memoire') => {
  const paliers = PAL.map((p, i) => ({ palier: p, seuil: i + 1, jour: i <= jusqua ? `2026-11-0${i + 1}` : null }));
  const prochain = paliers.find((p) => !p.jour);
  return { id, emoji: '🧠', nom: 'Mémoire', phrase: 'salue', paliers, palier: jusqua >= 0 ? PAL[jusqua] : null, prochain: prochain && { palier: prochain.palier, seuil: prochain.seuil }, avance: 0.5 };
};
const surprise = { id: 'mission', emoji: '🗺️', nom: 'Mission', surprise: true, palier: 'unique', jour: '2026-11-05' };

test('reglerSon : écrit le réglage sans toucher au reste, et n\'accepte que des booléens', () => {
  const f = { version: 1, son: false, cartes: {}, paliers: {} };
  assert.equal(reglerSon(f, true).son, true);
  assert.deepEqual(reglerSon(f, true).cartes, {});
  assert.equal(reglerSon(reglerSon(f, true), false).son, false);
  assert.equal(reglerSon(f, 'oui'), f);
});

test('badgeAuPalier : la carte telle qu\'elle était à ce Palier', () => {
  const b = badgeAuPalier(famille(2), 'argent');
  assert.equal(b.palier, 'argent');
  assert.deepEqual(b.paliers.map((p) => !!p.jour), [true, true, false, false]);
  assert.deepEqual(b.prochain, { palier: 'or', seuil: 3 });
  assert.equal(badgeAuPalier(surprise, 'unique'), surprise);
});

test('collectionRangee : un Palier à retourner ne se voit pas dans la grille', () => {
  const col = [famille(2), famille(0, 'autre'), surprise];
  const v = collectionRangee(col, [{ type: 'palier', id: 'memoire', palier: 'or' }, { type: 'palier', id: 'autre', palier: 'bronze' }, { type: 'palier', id: 'mission', palier: 'unique' }]);
  assert.equal(v.find((b) => b.id === 'memoire').palier, 'argent');
  assert.equal(v.find((b) => b.id === 'autre').palier, null);
  assert.equal(v.some((b) => b.id === 'mission'), false);
});

test('nouvellesCartes : face cachée avec médaillon, sans dire le Palier', () => {
  const col = [famille(2), surprise];
  const lignes = [{ lecon: 'troie', titre: 'Troie', retourne: null }];
  const n = nouvellesCartes({
    aRetourner: [{ type: 'ligne', id: 'troie' }, { type: 'palier', id: 'memoire', palier: 'or' }, { type: 'palier', id: 'mission', palier: 'unique' }],
    collection: col, cartesLigne: lignes,
  });
  assert.deepEqual(n.map((c) => c.medaillon), ['🚉', '🧠', '🗺️']);
  for (const c of n) assert.doesNotMatch(c.libelle, /bronze|argent|\bor\b|diamant|unique/i);
  assert.match(n[0].libelle, /nouvelle carte/i);
});

test('cartesLigneRangees : seulement les cartes retournées (rangées d\'office à la fermeture de la cérémonie)', () => {
  const l = [{ lecon: 'a', retourne: 'x' }, { lecon: 'b', retourne: 'x' }, { lecon: 'c', retourne: null }];
  assert.deepEqual(cartesLigneRangees(l).map((c) => c.lecon), ['a', 'b']);
});

test('emplacementCarte (encart de Leçon) : template, dos « Nouveau » (prête ou en composition), carte rangée', () => {
  const lignes = [
    { lecon: 'prete', titre: 'Troie', retourne: null, calques: { l1: '' } },
    { lecon: 'compose', titre: 'Rome', retourne: null, calques: null },
    { lecon: 'rangee', titre: 'Nil', retourne: '2026-11-05T10:00:00.000Z', calques: { l1: '' } },
  ];
  assert.deepEqual(emplacementCarte(lignes, 'jamais'), { etat: 'a-decouvrir' });
  assert.deepEqual(emplacementCarte([], 'x'), { etat: 'a-decouvrir' });
  const p = emplacementCarte(lignes, 'prete');
  assert.equal(p.etat, 'a-retourner'); assert.equal(p.prete, true); assert.equal(p.medaillon, '🚉');
  assert.match(p.libelle, /nouvelle carte.*Touche pour la retourner/i);
  const c = emplacementCarte(lignes, 'compose');
  assert.equal(c.etat, 'a-retourner'); assert.equal(c.prete, false);
  assert.doesNotMatch(c.libelle, /Touche pour la retourner/);
  assert.match(c.libelle, /prépar/i);
  const r = emplacementCarte(lignes, 'rangee');
  assert.equal(r.etat, 'rangee'); assert.equal(r.carte.lecon, 'rangee');
});

test('contientNouveau : tant qu\'une carte attend', () => {
  assert.equal(contientNouveau([]), false);
  assert.equal(contientNouveau([{ type: 'ligne', id: 'x' }]), true);
  assert.equal(contientNouveau(undefined), false);
});

test('carillon : plus long à mesure que le Palier monte, jamais vide', () => {
  const durees = [1, 2, 3, 4].map((r) => notesCarillon(r).at(-1).debut);
  assert.deepEqual(durees, [...durees].sort((a, b) => a - b));
  assert.ok(notesCarillon(4).length > notesCarillon(1).length);
  assert.ok(notesCarillon(0).length >= 1);
  assert.ok(notesCarillon(9).length <= 6);
});
