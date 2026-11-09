// Difficulté visée (ticket #152, spec #145 point 4) : le préambule du prof donne la réussite moyenne des derniers quiz
// comptés de la Leçon et lui dit quoi faire de la page suivante. Règle pure, tenue par l'appli. Fondement : règle des
// 85 % (Wilson et al. 2019, étude isolée, théorique) ; la fenêtre de 5 quiz et les seuils 70 et 90 % sont des
// hypothèses à mesurer (docs/cadres-scientifiques.md). Distinct du seuil de 80 % du Rebond, critère de maîtrise.
export const QUIZ_RECENTS = 5;
export const SEUIL_GUIDEE = 70;
export const SEUIL_DURCIR = 90;

// Réussite moyenne (arrondie) des QUIZ_RECENTS derniers quiz comptés : hors Pré-test, et hors questions bonus (le
// `score` d'un quiz ne les compte pas). null sans quiz compté.
export function reussiteRecente(scores = []) {
  const comptes = scores.filter((s) => s.pretest !== true && Number.isFinite(s.score)).slice(-QUIZ_RECENTS);
  if (!comptes.length) return null;
  return { moyenne: Math.round(comptes.reduce((t, s) => t + s.score, 0) / comptes.length), quiz: comptes.length };
}

// Réglage de la page suivante : 'durcir' au-delà de 90 %, 'guider' sous 70 %, 'garder' entre les deux (bornes comprises).
export const reglageDifficulte = (moyenne) => (moyenne > SEUIL_DURCIR ? 'durcir' : moyenne < SEUIL_GUIDEE ? 'guider' : 'garder');

const CONSIGNES = {
  durcir: "Rends la page suivante plus difficile : questions plus exigeantes, moins d'indices, notions combinées.",
  guider: "Rends la page suivante plus guidée : plus d'exemples, des étapes, des questions plus accessibles.",
  garder: 'Garde la difficulté de la page suivante inchangée.',
};

// Lignes du préambule ; rien sans quiz compté.
export function consigneDifficulte(scores) {
  const r = reussiteRecente(scores);
  if (!r) return [];
  const sur = r.quiz === 1 ? 'le dernier quiz' : `les ${r.quiz} derniers quiz`;
  return [`Réussite récente : ${r.moyenne} % en moyenne sur ${sur} de cette Leçon (hors Pré-test et questions bonus). ${CONSIGNES[reglageDifficulte(r.moyenne)]}`];
}
