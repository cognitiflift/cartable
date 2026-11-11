// Textes de l'archivage d'une Leçon (#203), sans DOM : partagés par l'appli et testés à part. Ranger est réversible
// (ADR 0002 : rien n'est effacé) et se dit sans mot d'échec ni de perte ; supprimer pour toujours nomme ce qui disparaît.

// Nom accessible du bouton ⋯ de la carte.
export const plusDActions = (titre) => `Plus d'actions pour ${titre}`;

export const ARCHIVER = {
  menu: 'Archiver',
  titre: (titre) => `Ranger « ${titre} » ?`,
  texte: 'Cette leçon sera rangée. Tu pourras la retrouver.',
  confirmer: 'Ranger',
  annuler: 'Annuler',
  rangee: 'Leçon rangée',
  defaire: 'Annuler',
};

export const SECTION_ARCHIVEES = { titre: 'Archivées', restaurer: 'Restaurer', supprimer: 'Supprimer…' };
export const restaurerNom = (titre) => `Restaurer ${titre}`;
export const supprimerNom = (titre) => `Supprimer définitivement ${titre}`;

export const SUPPRIMER = {
  titre: (titre) => `Supprimer « ${titre} » pour toujours ?`,
  texte: "La leçon, ses questions et ses pages seront effacées. Les étoiles et fusées qu'elle t'a données seront retirées de ton total. Tes badges et tes cartes restent à toi.",
  garder: 'Garder',
  confirmer: 'Supprimer pour toujours',
};

// Message d'une action qui n'a pas abouti : sans reproche, avec de quoi réessayer.
export const ECHEC_ARCHIVAGE = "Ça n'a pas marché, ce n'est pas de ta faute. Réessaie dans un instant.";
