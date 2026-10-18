import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionIdees, ECHEC_LECTURE } from '../public/nouvelle-lecon-texte.js';
import { confirmationFichiers, messageSujet, FICHIERS_MANQUANTS } from '../public/nouvelle-lecon-texte.js';

test('Idées prêtes avec des cartes : aucun texte d\'état, « D\'autres idées » proposé', () => {
  assert.deepEqual(sectionIdees({ etat: 'prêtes', nombreCartes: 4 }), { autresIdees: true });
});

test('Idées en préparation sans carte : « On prépare tes idées… » et rien d\'autre, sans « D\'autres idées »', () => {
  assert.deepEqual(sectionIdees({ etat: 'en préparation', nombreCartes: 0 }), { texte: 'On prépare tes idées…', autresIdees: false });
});

test('Idées en préparation à côté des anciennes cartes : « Nouvelles idées en préparation… », sans « D\'autres idées »', () => {
  assert.deepEqual(sectionIdees({ etat: 'en préparation', nombreCartes: 3 }), { texte: 'Nouvelles idées en préparation…', autresIdees: false });
});

const PAS_D_IDEE = "Pas d'idée pour l'instant. Tu peux choisir ton propre sujet, ou demander d'autres idées.";

test('Idées indisponibles : un message qui dit quoi faire (son propre sujet ou d\'autres idées), et « D\'autres idées » proposé', () => {
  assert.deepEqual(sectionIdees({ etat: 'indisponibles', nombreCartes: 0 }), { texte: PAS_D_IDEE, autresIdees: true });
});

test('Un lot prêt mais vide se dit comme des idées indisponibles', () => {
  assert.deepEqual(sectionIdees({ etat: 'prêtes', nombreCartes: 0 }), { texte: PAS_D_IDEE, autresIdees: true });
});

test('Échec de lecture des Propositions : un message bienveillant qui dit quoi faire, et « D\'autres idées » pour réessayer', () => {
  assert.deepEqual(sectionIdees({ etat: ECHEC_LECTURE, nombreCartes: 0 }), {
    texte: "Tes idées n'ont pas pu s'afficher, ce n'est pas de ta faute. Tu peux choisir ton propre sujet, ou demander d'autres idées.",
    autresIdees: true,
  });
});

test('Section d\'idées : jamais `false`, `null` ni vide, et toujours un texte quand il n\'y a aucune carte', () => {
  for (const etat of ['prêtes', 'en préparation', 'indisponibles', ECHEC_LECTURE]) {
    for (const nombreCartes of [0, 1, 4]) {
      const section = sectionIdees({ etat, nombreCartes });
      assert.equal(typeof section.autresIdees, 'boolean', `${etat}, ${nombreCartes} cartes`);
      if ('texte' in section || nombreCartes === 0) {
        assert.equal(typeof section.texte, 'string', `${etat}, ${nombreCartes} cartes`);
        assert.ok(section.texte.trim().length > 0, `${etat}, ${nombreCartes} cartes`);
      }
    }
  }
});

test('Confirmation des fichiers : une seule page, avec son nom', () => {
  assert.equal(confirmationFichiers(['cahier.jpg']), '1 page : cahier.jpg');
});

test('Confirmation des fichiers : plusieurs pages, leur nombre puis leurs noms dans l\'ordre choisi', () => {
  assert.equal(confirmationFichiers(['page1.jpg', 'page2.jpg', 'lecon.pdf']), '3 pages : page1.jpg, page2.jpg, lecon.pdf');
});

test('Sujet vide ou fait d\'espaces : « Dis-moi ce que tu veux apprendre »', () => {
  assert.equal(messageSujet('', 80), 'Dis-moi ce que tu veux apprendre');
  assert.equal(messageSujet('   ', 80), 'Dis-moi ce que tu veux apprendre');
});

test('Sujet trop long : le message donne la longueur maximale', () => {
  assert.equal(messageSujet('a'.repeat(81), 80), 'Ton sujet est trop long (80 caractères au plus)');
});

test('Sujet correct, même à la longueur maximale : aucun message', () => {
  assert.equal(messageSujet('les volcans', 80), null);
  assert.equal(messageSujet(` ${'a'.repeat(80)} `, 80), null);
});

test('Révision sans fichier : un message qui demande au moins une photo ou un PDF, en tutoiement', () => {
  assert.equal(FICHIERS_MANQUANTS, 'Choisis au moins une photo ou un PDF de ta leçon');
});
