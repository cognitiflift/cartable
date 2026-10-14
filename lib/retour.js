import { QUIZ_REUSSI, depassementReussi } from './store.js';

// Retour de quiz instantané (ADR 0002, mise à jour) : l'appli le compose elle-même, sans tour du prof, à partir de
// phrases préparées selon le score, ce qui est réussi, les Étoiles nouvelles et le Dépassement. Toujours encourageant :
// les questions ratées sont commentées par le prof en tête de la Page de leçon suivante.

const LIBELLES_ETOILES = { quiz: 'quiz réussi', bonus: 'questions bonus réussies', defi: 'Défi réussi' };

function phraseScore(score) {
  if (score === 100) return 'Parfait, 100 % : tout est juste ! 🎉';
  if (score >= QUIZ_REUSSI) return `Bravo, ${score} % : quiz réussi ! 👏`;
  if (score >= 50) return `Bien joué, ${score} % : tu es sur la bonne voie ! 💪`;
  return `${score} %, c'est un début : chaque erreur t'apprend quelque chose. 🌱`;
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function phraseReussies(questions = []) {
  const comptees = questions.filter((q) => !q.bonus);
  if (!comptees.length) return null;
  const justes = comptees.filter((q) => q.juste).length;
  return `Tu as trouvé ${pluriel(justes, 'réponse')} sur ${comptees.length}.`;
}

function phraseDepassement(bonus) {
  if (!bonus) return null;
  if (depassementReussi(bonus)) return `🚀 Dépassement réussi : ${bonus.reussies} questions bonus sur ${bonus.total} !`;
  if (bonus.reussies === 1) return `🚀 1 question bonus sur ${bonus.total} : bravo d'avoir tenté d'aller plus loin !`;
  return '🚀 Les questions bonus allaient plus loin que la leçon : elles ne comptent pas dans ton score.';
}

function phraseEtoiles(etoiles = []) {
  if (!etoiles.length) return null;
  return `⭐ ${etoiles.length > 1 ? 'Nouvelles Étoiles' : 'Nouvelle Étoile'} : ${etoiles.map((e) => LIBELLES_ETOILES[e]).join(', ')} !`;
}

// `questions` : résultats par question validés (voir lib/resultats.js), absents pour les anciennes Leçons.
export function texteRetourQuiz({ score, action, bonus = null, nouvellesEtoiles = [], questions = [] }) {
  return [
    phraseScore(score),
    phraseReussies(questions),
    phraseDepassement(bonus),
    phraseEtoiles(nouvellesEtoiles),
    action === 'terminee' ? '🏁 Défi réussi : ta Leçon est terminée !' : null,
  ].filter(Boolean).join('\n');
}
