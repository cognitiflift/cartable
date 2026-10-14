import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texteRetourQuiz } from '../lib/retour.js';

const resultats = (justes, total) => Array.from({ length: total }, (_, i) => ({ id: `q${i + 1}`, juste: i < justes, bonus: false }));

test('Retour de quiz : la phrase du score cite le nombre de réponses justes (hors bonus), selon le palier', () => {
  assert.equal(texteRetourQuiz({ score: 100, action: 'suivante', questions: resultats(5, 5) }), 'Parfait : 5 réponses sur 5 ! 🎉');
  assert.match(texteRetourQuiz({ score: 80, action: 'suivante', questions: resultats(4, 5) }), /^Bravo, quiz réussi : 4 réponses sur 5 ! 👏/);
  assert.match(texteRetourQuiz({ score: 60, action: 'suivante', questions: resultats(3, 5) }), /^Bien joué : 3 réponses sur 5\. Tu es sur la bonne voie ! 💪/);
  assert.match(texteRetourQuiz({ score: 20, action: 'revoir', questions: resultats(1, 5) }), /^Pas encore, mais ça viendra : 1 réponse sur 5\. 🌱/);
  // Les questions bonus ne comptent pas dans le nombre de réponses.
  const avecBonus = [...resultats(2, 3), { id: 'b1', juste: true, bonus: true }];
  assert.match(texteRetourQuiz({ score: 67, action: 'suivante', questions: avecBonus }), /2 réponses sur 3/);
});

test('Retour de quiz : sans résultats par question (anciennes Leçons), le score en %', () => {
  assert.equal(texteRetourQuiz({ score: 100, action: 'suivante' }), 'Parfait : 100 % ! 🎉');
  assert.match(texteRetourQuiz({ score: 0, action: 'revoir' }), /^Pas encore, mais ça viendra : 0 %\. 🌱/);
});

test('Retour de quiz : un score faible ne commence jamais par le chiffre', () => {
  for (let rang = 0; rang < 6; rang++) {
    for (const [justes, score] of [[0, 0], [1, 20], [2, 40]]) {
      const texte = texteRetourQuiz({ score, action: 'revoir', questions: resultats(justes, 5), rang });
      assert.match(texte, /^[^\d]/, texte);
      assert.match(texte.split('\n')[0], /🌱$/);
    }
  }
});

test('Retour de quiz : plusieurs tournures par palier, choisies par le rang du quiz dans la Leçon', () => {
  const premieres = (score, justes) => new Set([0, 1, 2, 3].map((rang) => texteRetourQuiz({ score, action: 'suivante', questions: resultats(justes, 5), rang }).split('\n')[0]));
  for (const [score, justes] of [[100, 5], [80, 4], [60, 3], [20, 1]]) {
    assert.equal(premieres(score, justes).size, 3, `palier ${score} %`);
  }
  // Même rang, même texte : le Retour enregistré se recalcule à l'identique.
  const args = { score: 80, action: 'suivante', questions: resultats(4, 5), rang: 7 };
  assert.equal(texteRetourQuiz(args), texteRetourQuiz(args));
});

test('Retour de quiz : annonce la suite selon l\'action', () => {
  assert.match(texteRetourQuiz({ score: 40, action: 'revoir', questions: resultats(2, 5) }), /\nLa page Revoir reprendra les questions que tu as ratées\.$/);
  assert.match(texteRetourQuiz({ score: 80, action: 'defi', questions: resultats(4, 5) }), /\nEnvie de montrer ce que tu sais \? Le Défi t'attend !$/);
  assert.match(texteRetourQuiz({ score: 60, action: 'suivante', questions: resultats(3, 5) }), /\nLa prochaine page commencera par ce que tu as raté\.$/);
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante' }), /\nLa prochaine page commencera par ce que tu as raté\.$/);
  // Rien de raté : pas d'annonce d'encart.
  assert.doesNotMatch(texteRetourQuiz({ score: 100, action: 'suivante', questions: resultats(5, 5) }), /raté/);
  assert.match(texteRetourQuiz({ score: 90, action: 'terminee' }), /\n🏁 Défi réussi : ta Leçon est terminée !$/);
  assert.doesNotMatch(texteRetourQuiz({ score: 90, action: 'defi' }), /terminée/);
});

test('Retour de quiz : annonce les Étoiles nouvelles', () => {
  assert.match(texteRetourQuiz({ score: 90, action: 'defi', nouvellesEtoiles: ['quiz'] }), /⭐ Nouvelle Étoile : quiz réussi !/);
  assert.match(
    texteRetourQuiz({ score: 90, action: 'terminee', nouvellesEtoiles: ['bonus', 'defi'] }),
    /⭐ Nouvelles Étoiles : questions bonus réussies, Défi réussi !/,
  );
  assert.doesNotMatch(texteRetourQuiz({ score: 90, action: 'defi' }), /Étoile/);
});

test('Retour de quiz : le Dépassement est salué dès une question bonus réussie, encouragé sinon, absent sans questions bonus', () => {
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 2, total: 3 } }), /🚀 Dépassement réussi : 2 questions bonus sur 3 !/);
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 1, total: 3 } }), /🚀 1 question bonus réussie sur 3 : bravo d'avoir poussé plus loin !/);
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 1, total: 1 } }), /🚀 1 question bonus réussie sur 1 : bravo d'avoir poussé plus loin !/);
  assert.match(texteRetourQuiz({ score: 70, action: 'suivante', bonus: { reussies: 0, total: 2 } }), /🚀 Les questions bonus allaient plus loin que la leçon : elles ne comptent pas dans ton score\./);
  assert.doesNotMatch(texteRetourQuiz({ score: 70, action: 'suivante' }), /🚀/);
});

test('Retour de quiz : aucune tournure accordée au genre de l\'Élève', () => {
  const textes = [];
  for (let rang = 0; rang < 3; rang++) {
    for (const [score, justes, action] of [[100, 5, 'suivante'], [80, 4, 'defi'], [60, 3, 'suivante'], [20, 1, 'revoir'], [90, 5, 'terminee']]) {
      textes.push(texteRetourQuiz({ score, action, questions: resultats(justes, 5), rang, bonus: { reussies: rang, total: 2 }, nouvellesEtoiles: ['quiz'] }));
    }
  }
  for (const t of textes) assert.doesNotMatch(t, /\b(prêt|prête|allé|allée|piégé|piégée|fort|forte|content|contente)\b/i, t);
});
