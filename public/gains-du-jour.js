// Les gains d'aujourd'hui (Étoiles, Fusées, Paliers de Badge) pour l'accueil, lus dans le calendrier de Mes badges.
// null quand il n'y en a pas : l'accueil n'affiche alors rien (pas de zone vide, pas de « 0 »).
export function gainsDuJour(calendrier) {
  const gains = calendrier?.jours.find((j) => j.jour === calendrier.aujourdhui)?.gains;
  return gains && (gains.etoiles > 0 || gains.fusees > 0 || gains.paliers.length > 0) ? gains : null;
}
