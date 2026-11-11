import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reperesBadge, noteBadge, libelleChoisirBadge, libelleBadgeParent, libellePalierApercu, origineVersion, libelleRegenererBadge, notesRegenerationBadge, badgeRegenerationAbandonnee } from '../public/carte-parent-badge-texte.js';

const famille = (obtenus) => ({ nom: 'Mémoire', surprise: false, trouve: obtenus > 0, versionActive: 1, versions: [{ numero: 1, code: true }],
  paliers: ['bronze', 'argent', 'or', 'diamant'].map((palier, i) => ({ palier, obtenu: i < obtenus })) });
const surprise = (trouve) => ({ nom: 'Cliché !', surprise: true, trouve, versionActive: 2, versions: [{ numero: 1 }, { numero: 2 }], paliers: [{ palier: 'unique', obtenu: trouve }] });

test('repères : le Palier le plus haut, ou rien encore, puis la version active', () => {
  assert.deepEqual(reperesBadge(famille(2)), ['Palier argent', 'Version 1 active']);
  assert.deepEqual(reperesBadge(famille(0)), ['Pas encore commencé', 'Version 1 active']);
  assert.deepEqual(reperesBadge(surprise(true)), ['Surprise trouvée', 'Version 2 active']);
  assert.deepEqual(reperesBadge(surprise(false)), ['Surprise pas encore trouvée', 'Version 2 active']);
});

test('note : seulement pour un badge que l’Élève n’a pas encore', () => {
  assert.match(noteBadge(surprise(false)), /le jour où il la trouve/);
  assert.match(noteBadge(famille(0)), /premier Palier/);
  assert.equal(noteBadge(famille(1)), null);
});

test('libellés : le choix dit qu’il vaut pour tous les Paliers', () => {
  assert.match(libelleChoisirBadge(famille(1), { numero: 2 }), /version 2 .*Mémoire.* tous ses Paliers/);
  assert.match(libelleBadgeParent(surprise(true)), /2 versions, version 2 active/);
  assert.equal(libellePalierApercu('unique'), 'Surprise');
  assert.equal(libellePalierApercu('or'), 'Or');
  assert.equal(origineVersion({ code: true }), 'Dessin d’origine');
});

test('régénération : libellés, version en cours, abandon averti', () => {
  const b = { ...famille(1), regeneration: false, echecRegeneration: false };
  assert.match(libelleRegenererBadge(b), /Régénérer la carte de Badge « Mémoire » .* tous ses Paliers/);
  assert.deepEqual(notesRegenerationBadge(b), []);
  assert.deepEqual(notesRegenerationBadge({ ...b, regeneration: true }), ['Une nouvelle version est en cours : elle arrivera dans la galerie, la version active ne change pas.']);
  assert.match(notesRegenerationBadge({ ...b, echecRegeneration: true })[0], /abandonnée après deux essais ratés\. La version active n’a pas changé/);
  assert.equal(badgeRegenerationAbandonnee({ ...b, echecRegeneration: true }), true);
  assert.equal(badgeRegenerationAbandonnee({ ...b, regeneration: true, echecRegeneration: true }), false);
  assert.match(libelleBadgeParent({ ...b, regeneration: true }), /nouvelle version en cours/);
});
