// Cycle de régénération commun aux cartes de ligne (lib/cartes.js) et aux cartes de Badge (lib/cartes-badge.js), spec #235.
// Il s'applique à une « entrée » (la carte de ligne, ou l'entrée du badge) : le module qui l'appelle sait la trouver dans son
// fichier et l'y remettre, ce module ne connaît que le cycle.
//
// `regeneration` : { etat: DEMANDEE | EN_COURS, essais } tant qu'un tour est attendu ou travaille (absent sinon) ;
// `echecRegeneration` : date ISO du dernier abandon, après ESSAIS_MAX essais ratés (effacée à la demande suivante).
// Chaque fonction rend une nouvelle entrée, ou la même (sans effet) quand l'entrée n'est pas dans l'état attendu.

export const ESSAIS_MAX = 2;
export const DEMANDEE = 'demandee';
export const EN_COURS = 'en-cours';
// Statut rendu au parent par une demande : demandee (partie), deja (une est déjà demandée ou en cours : même fichier).
export const STATUT_DEMANDEE = 'demandee';
export const STATUT_DEJA = 'deja';

export const estDemandee = (entree) => entree?.regeneration?.etat === DEMANDEE;
export const estEnCours = (entree) => entree?.regeneration?.etat === EN_COURS;

// Demande : efface l'avertissement du dernier abandon, repart de zéro essai.
export function demanderEntree(entree) {
  const { echecRegeneration: _, ...reste } = entree;
  return { ...reste, regeneration: { etat: DEMANDEE, essais: 0 } };
}

// Début d'un tour : « en cours », un essai de plus. Sans effet si elle n'est pas « demandée ».
export const commencerEntree = (entree) => (estDemandee(entree) ? { ...entree, regeneration: { etat: EN_COURS, essais: entree.regeneration.essais + 1 } } : entree);

// Tour réussi : l'entrée sans sa régénération (l'appelant y ajoute la version). Sans effet si aucune n'est « en cours ».
export function terminerEntree(entree) {
  if (!estEnCours(entree)) return entree;
  const { regeneration: _, ...reste } = entree;
  return reste;
}

// Tour raté : redemandé tant qu'il reste un essai ; au dernier, abandon et `echecRegeneration`. Sans effet si aucune n'est « en cours ».
export function echouerEntree(entree, maintenant) {
  if (!estEnCours(entree)) return entree;
  const { regeneration, ...reste } = entree;
  return regeneration.essais >= ESSAIS_MAX ? { ...reste, echecRegeneration: new Date(maintenant).toISOString() } : { ...reste, regeneration: { ...regeneration, etat: DEMANDEE } };
}

// Au redémarrage, un tour interrompu redevient « demandé » (ses essais restent comptés).
export const reprendreEntree = (entree) => (estEnCours(entree) ? { ...entree, regeneration: { ...entree.regeneration, etat: DEMANDEE } } : entree);
