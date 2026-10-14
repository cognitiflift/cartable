import { QUIZ_REUSSI, depassementReussi } from './store.js';
import { compterJustes } from '../public/kit/v1/quiz-logique.js';

// Retour de quiz instantané (ADR 0002, mise à jour) : l'appli le compose elle-même, sans tour du prof, à partir de
// phrases préparées selon le score, ce qui est réussi, le Dépassement, les Étoiles nouvelles et la suite. Toujours
// encourageant : un score faible ne commence jamais par le chiffre, et les questions ratées sont commentées par le prof
// en tête de la Page de leçon suivante. Aucune tournure ne s'accorde au genre de l'Élève.

const LIBELLES_ETOILES = { quiz: 'quiz réussi', bonus: 'questions bonus réussies', defi: 'Défi réussi' };

// Trois tournures par palier (`m` : « 4 réponses sur 5 », ou « 80 % » sans résultats par question), pour que le
// Retour ne soit pas toujours le même. Le rang du quiz dans la Leçon choisit la tournure : même quiz, même texte.
const TOURNURES = [
  { min: 100, phrases: [(m) => `Parfait : ${m} ! 🎉`, (m) => `Sans faute : ${m} ! 🎉`, (m) => `Tout juste : ${m} ! 🎉`] },
  { min: QUIZ_REUSSI, phrases: [(m) => `Bravo, quiz réussi : ${m} ! 👏`, (m) => `Quiz réussi, bien joué : ${m} ! 👏`, (m) => `Belle réussite : ${m} ! 👏`] },
  { min: 50, phrases: [(m) => `Bien joué : ${m}. Tu es sur la bonne voie ! 💪`, (m) => `Bel effort : ${m}. Tu y es presque ! 💪`, (m) => `Ça avance : ${m}. Continue comme ça ! 💪`] },
  { min: 0, phrases: [(m) => `Pas encore, mais ça viendra : ${m}. 🌱`, (m) => `Pas encore, et c'est normal en apprenant : ${m}. 🌱`, (m) => `Pas encore : ${m}. Chaque erreur t'apprend quelque chose. 🌱`] },
];

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function phraseScore(score, { justes, total }, rang) {
  const mesure = total ? `${pluriel(justes, 'réponse')} sur ${total}` : `${score} %`;
  const { phrases } = TOURNURES.find((t) => score >= t.min);
  return phrases[rang % phrases.length](mesure);
}

function phraseDepassement(bonus) {
  if (!bonus) return null;
  if (depassementReussi(bonus)) return `🚀 Dépassement réussi : ${bonus.reussies} questions bonus sur ${bonus.total} !`;
  if (bonus.reussies === 1) return `🚀 1 question bonus réussie sur ${bonus.total} : bravo d'avoir poussé plus loin !`;
  return '🚀 Les questions bonus allaient plus loin que la leçon : elles ne comptent pas dans ton score.';
}

function phraseEtoiles(etoiles = []) {
  if (!etoiles.length) return null;
  return `⭐ ${etoiles.length > 1 ? 'Nouvelles Étoiles' : 'Nouvelle Étoile'} : ${etoiles.map((e) => LIBELLES_ETOILES[e]).join(', ')} !`;
}

// Ce qui vient après le quiz, selon l'action : toute nouvelle page commence par un encart sur ce qui a été raté.
function phraseSuite(action, rate) {
  if (action === 'terminee') return '🏁 Défi réussi : ta Leçon est terminée !';
  if (action === 'revoir') return 'La page Revoir reprendra les questions que tu as ratées.';
  if (action === 'defi') return "Envie de montrer ce que tu sais ? Le Défi t'attend !";
  return rate ? 'La prochaine page commencera par ce que tu as raté.' : null;
}

// `questions` : résultats par question validés (voir lib/resultats.js), absents pour les anciennes Leçons.
// `rang` : nombre de quiz déjà faits dans la Leçon, pour varier les tournures.
export function texteRetourQuiz({ score, action, bonus = null, nouvellesEtoiles = [], questions = [], rang = 0 }) {
  const reussies = compterJustes(questions);
  const rate = reussies.total ? reussies.justes < reussies.total : score < 100;
  return [
    phraseScore(score, reussies, rang),
    phraseDepassement(bonus),
    phraseEtoiles(nouvellesEtoiles),
    phraseSuite(action, rate),
  ].filter(Boolean).join('\n');
}
