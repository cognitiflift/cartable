// Phrase de conclusion de la rubrique « Indicateurs » de la Vue parent (#165), en mots simples : les chiffres exacts
// restent dans « Pour les curieux ». Seuils sans cadre écrit, hypothèses à mesurer (docs/cadres-scientifiques.md).
export const MIN_REPONSES_CONCLUSION = 10; // en dessous, trop peu de réponses pour juger
export const SOUVENIR_BON = 80; // % de réponses justes aux Révisions du jour : « plutôt justes » à partir de là
export const SOUVENIR_FAIBLE = 60; // en dessous : « souvent ratées »
export const RETOUR_BON = 50; // % de Leçons pour lesquelles l'Élève revient la semaine d'après
export const ECART_RAPPELS_BON = 10; // points d'écart moyen entre prédit et réel au-delà desquels les rappels sont jugés mal placés

const PAS_ASSEZ = 'Pas encore assez d’activité pour dire si l’appli aide à retenir.';

function phraseSouvenir({ reponses, pourcentage }) {
  if (reponses < MIN_REPONSES_CONCLUSION) return null;
  if (pourcentage >= SOUVENIR_BON) return 'Les Révisions du jour sont plutôt justes : ce qui est revu tient bien.';
  if (pourcentage < SOUVENIR_FAIBLE) return 'Les Révisions du jour sont souvent ratées : ce qui est revu ne tient pas encore.';
  return 'Les Révisions du jour sont à moitié justes.';
}
function phraseRetour({ lecons, pourcentage }) {
  if (!lecons) return null;
  return pourcentage >= RETOUR_BON ? 'L’Élève revient la semaine après une nouvelle Leçon.' : 'L’Élève ne revient pas toujours la semaine après une nouvelle Leçon.';
}
// Écart moyen, pondéré par le nombre de réponses, entre la part de souvenirs annoncée par l'appli et la part réelle.
function phraseRappels(calibration) {
  const tranches = calibration.filter((t) => t.reponses);
  const reponses = tranches.reduce((s, t) => s + t.reponses, 0);
  if (reponses < MIN_REPONSES_CONCLUSION) return null;
  const ecart = tranches.reduce((s, t) => s + t.reponses * Math.abs(t.predit - t.pourcentage), 0) / reponses;
  return ecart <= ECART_RAPPELS_BON ? 'Les rappels tombent au bon moment.' : 'Les rappels ne tombent pas encore au bon moment.';
}

export function conclusionDesIndicateurs({ souvenir, retour, calibration }) {
  const phrases = [phraseSouvenir(souvenir), phraseRetour(retour), phraseRappels(calibration)].filter(Boolean);
  return phrases.length ? phrases.join(' ') : PAS_ASSEZ;
}
