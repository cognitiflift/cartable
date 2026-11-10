import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARCHIVER, SUPPRIMER, SECTION_ARCHIVEES, plusDActions, restaurerNom, supprimerNom, ECHEC_ARCHIVAGE } from '../public/archivage-texte.js';

test('Archiver : confirmation courte, message « Leçon rangée · Annuler », aucun mot d\'échec ni de perte', () => {
  assert.equal(ARCHIVER.texte, 'Cette leçon sera rangée. Tu pourras la retrouver.');
  assert.deepEqual([ARCHIVER.rangee, ARCHIVER.defaire], ['Leçon rangée', 'Annuler']);
  const dits = [ARCHIVER.menu, ARCHIVER.titre('Les volcans'), ARCHIVER.texte, ARCHIVER.confirmer, ARCHIVER.rangee].join(' ');
  assert.doesNotMatch(dits, /supprim|effac|perd|perdu|échec|raté/i);
});

test('Supprimer pour toujours : la confirmation nomme la perte et ce qui reste, « Garder » d\'abord', () => {
  assert.match(SUPPRIMER.texte, /La leçon, ses questions et ses pages seront effacées\./);
  assert.match(SUPPRIMER.texte, /étoiles et fusées .* retirées de ton total/);
  assert.match(SUPPRIMER.texte, /Tes badges et tes cartes restent à toi\./);
  assert.deepEqual([SUPPRIMER.garder, SUPPRIMER.confirmer], ['Garder', 'Supprimer pour toujours']);
});

test('Noms accessibles : le titre de la Leçon est dit, Supprimer et Restaurer ne se confondent pas', () => {
  assert.equal(plusDActions('Les volcans'), "Plus d'actions pour Les volcans");
  assert.match(restaurerNom('Les volcans'), /^Restaurer .*Les volcans/);
  assert.match(supprimerNom('Les volcans'), /^Supprimer définitivement .*Les volcans/);
  assert.equal(SECTION_ARCHIVEES.titre, 'Archivées');
  assert.match(ECHEC_ARCHIVAGE, /Réessaie/); // dit quoi faire ensuite
});
