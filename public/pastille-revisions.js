// Pastille des Révisions du jour sur l'accueil (#193) : jamais plus de 10, comme la série servie
// (SERIE_MAX, lib/revisions.js). Le total réel reste dans la Vue parent.
const SERIE = 10;

// `faitesAujourdhui` : réponses en Révision du jour aujourd'hui (rythme.objectifDuJour.revisions).
export function pastilleRevisions({ dues }, faitesAujourdhui = 0) {
  const compte = Math.min(dues, SERIE);
  const sousTitre = !dues ? 'Rien à revoir aujourd’hui'
    : faitesAujourdhui >= SERIE ? 'Continuer à réviser' : 'à revoir aujourd’hui';
  return { compte, cache: compte > 1 ? ' questions' : ' question', sousTitre };
}
