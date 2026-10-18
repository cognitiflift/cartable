import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sectionIdees, ECHEC_LECTURE, carteAttente, carteErreur } from '../public/nouvelle-lecon-texte.js';

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

const DUREE = 'Ça peut prendre quelques minutes.';
const ENSUITE = 'Ensuite : quelques questions pour deviner ce que tu sais déjà.';

test('Attente avec un sujet connu : la carte nomme le sujet, annonce la durée et le Pré-test', () => {
  assert.deepEqual(carteAttente({ sujet: 'Les volcans', mode: 'libre' }), {
    titre: 'Ton prof prépare « Les volcans »…', duree: DUREE, ensuite: ENSUITE,
  });
});

test('Attente avec un sujet tapé entouré d\'espaces : le sujet est nommé sans eux', () => {
  assert.equal(carteAttente({ sujet: '  la conjugaison du futur ', mode: 'libre' }).titre, 'Ton prof prépare « la conjugaison du futur »…');
});

test('Attente sans sujet connu : un titre qui ne nomme rien', () => {
  assert.deepEqual(carteAttente({ mode: 'libre' }), { titre: 'Ton prof prépare ta leçon…', duree: DUREE, ensuite: ENSUITE });
  assert.equal(carteAttente({ sujet: '   ', mode: 'libre' }).titre, 'Ton prof prépare ta leçon…');
});

test('Attente en révision : le prof lit d\'abord la leçon de classe, le sujet n\'est pas encore connu', () => {
  assert.deepEqual(carteAttente({ mode: 'revision' }), {
    titre: 'Ton prof lit ta leçon de classe et la prépare…', duree: DUREE, ensuite: ENSUITE,
  });
});

test('Erreur de préparation : un titre simple et le message du serveur', () => {
  assert.deepEqual(carteErreur({ message: "Cette idée n'est plus proposée" }), {
    titre: "Ta leçon n'a pas pu se préparer", message: "Cette idée n'est plus proposée",
  });
});

test('Erreur sans message du serveur : un message qui dit quoi faire, jamais vide', () => {
  for (const message of [undefined, '', '  ']) {
    assert.deepEqual(carteErreur({ message }), {
      titre: "Ta leçon n'a pas pu se préparer", message: "Ce n'est pas de ta faute. Tu peux réessayer, ou choisir autre chose.",
    });
  }
});
