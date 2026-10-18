import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionIdees, ECHEC_LECTURE, cartoucheProposition, colonnesPropositions, questionCadrage } from '../public/nouvelle-lecon-texte.js';
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

test('Cartouche d\'une suite : « Prolonge ta ligne », pour ne pas la confondre avec « Pour aller plus loin » (Dépassement)', () => {
  assert.equal(cartoucheProposition('suite'), 'Prolonge ta ligne');
});

test('Cartouche d\'un original : « Nouveau sujet »', () => {
  assert.equal(cartoucheProposition('original'), 'Nouveau sujet');
});

// Nombre de colonnes de la grille, pour une place qui en tient au plus `maximum` : aucune carte seule sur sa rangée.
const rangees = (nombre, colonnes) => Array.from({ length: Math.ceil(nombre / colonnes) }, (_, i) => Math.min(colonnes, nombre - i * colonnes));

test('Grille : 4 Propositions sur 4 colonnes (ordinateur) et en 2 + 2 quand il n\'en tient que 3 (tablette)', () => {
  assert.equal(colonnesPropositions(4, 4), 4);
  assert.equal(colonnesPropositions(4, 3), 2);
  assert.equal(colonnesPropositions(4, 2), 2);
});

test('Grille : 5 Propositions en 3 + 2, sur ordinateur comme sur tablette', () => {
  assert.equal(colonnesPropositions(5, 4), 3);
  assert.equal(colonnesPropositions(5, 3), 3);
});

test('Grille : moins de cartes que de colonnes, elles se partagent la rangée', () => {
  assert.equal(colonnesPropositions(2, 4), 2);
  assert.equal(colonnesPropositions(3, 4), 3);
});

test('Grille : de 2 à 10 Propositions (réglage du Profil), aucune carte seule sur la dernière rangée dès 2 colonnes', () => {
  for (let nombre = 2; nombre <= 10; nombre++) {
    for (const maximum of [2, 3, 4]) {
      const colonnes = colonnesPropositions(nombre, maximum);
      assert.ok(colonnes >= 1 && colonnes <= maximum, `${nombre} cartes, ${maximum} colonnes au plus`);
      if (colonnes > 1) assert.ok(!rangees(nombre, colonnes).includes(1), `${nombre} cartes sur ${colonnes} colonnes`);
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

// Cadrage (#118) : la question nomme le sujet quand il est connu ; les questions du serveur restent la référence.
test('Cadrage d\'un sujet connu : « Pourquoi ? » nomme le sujet', () => {
  assert.equal(questionCadrage({ cle: 'pourquoi', question: 'Pourquoi ?', sujet: 'Les volcans' }),
    'Pourquoi veux-tu apprendre « Les volcans » ?');
});

test('Cadrage d\'un sujet connu : « Tu en sais déjà… » nomme le sujet', () => {
  assert.equal(questionCadrage({ cle: 'deja', question: 'Tu en sais déjà…', sujet: 'Les volcans' }),
    'Sur « Les volcans », tu en sais déjà…');
});

test('Cadrage d\'une révision, sujet pas encore connu : la question du serveur, inchangée', () => {
  assert.equal(questionCadrage({ cle: 'deja', question: 'Tu en sais déjà…' }), 'Tu en sais déjà…');
  assert.equal(questionCadrage({ cle: 'deja', question: 'Tu en sais déjà…', sujet: '   ' }), 'Tu en sais déjà…');
});

test('Cadrage : un sujet tapé avec des espaces autour est nommé sans eux', () => {
  assert.equal(questionCadrage({ cle: 'pourquoi', question: 'Pourquoi ?', sujet: '  la conjugaison du futur ' }),
    'Pourquoi veux-tu apprendre « la conjugaison du futur » ?');
});

test('Cadrage : une question inconnue du module reste celle du serveur, même avec un sujet', () => {
  assert.equal(questionCadrage({ cle: 'autre', question: 'Une autre question ?', sujet: 'Les volcans' }), 'Une autre question ?');
});
