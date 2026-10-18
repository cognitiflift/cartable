// Textes de l'écran Nouvelle leçon (spec #115), sans DOM : partagés par l'appli et testés à part.
// Ce module décide de ce que l'écran dit ; l'écran ne fait que le dessiner. Chaque texte attendu est une chaîne
// non vide, jamais `false` ni `null`, pour que rien ne s'affiche comme « false ».

// État de la section d'idées quand la lecture des Propositions a échoué ; les autres états viennent de
// GET …/propositions : « prêtes », « en préparation », « indisponibles ».
export const ECHEC_LECTURE = 'échec de lecture';

const QUOI_FAIRE = "Tu peux choisir ton propre sujet, ou demander d'autres idées.";

// Section « 🎲 Des idées pour toi », d'après l'état des Propositions et le nombre de cartes affichées.
// Renvoie { texte?, autresIdees } : `texte` (absent quand les cartes suffisent) se dit sous les cartes ;
// `autresIdees` dit si « D'autres idées » est proposé, c'est-à-dire si aucune préparation n'est en cours.
export function sectionIdees({ etat, nombreCartes }) {
  if (etat === 'en préparation') {
    return { texte: nombreCartes > 0 ? 'Nouvelles idées en préparation…' : 'On prépare tes idées…', autresIdees: false };
  }
  if (etat === ECHEC_LECTURE) return { texte: `Tes idées n'ont pas pu s'afficher, ce n'est pas de ta faute. ${QUOI_FAIRE}`, autresIdees: true };
  if (nombreCartes === 0) return { texte: `Pas d'idée pour l'instant. ${QUOI_FAIRE}`, autresIdees: true };
  return { autresIdees: true };
}

// Confirmation des photos ou PDF choisis pour « Réviser une leçon de classe », d'après leurs noms dans l'ordre choisi.
export function confirmationFichiers(noms) {
  return `${noms.length} ${noms.length > 1 ? 'pages' : 'page'} : ${noms.join(', ')}`;
}

// Messages de validation des deux voies, dits par l'appli à côté du formulaire, à la place de la bulle du navigateur.
export const FICHIERS_MANQUANTS = 'Choisis au moins une photo ou un PDF de ta leçon';

// Message pour le sujet tapé (espaces autour ignorés, comme le serveur), ou `null` s'il convient.
export function messageSujet(texte, sujetMax) {
  const sujet = texte.trim();
  if (!sujet) return 'Dis-moi ce que tu veux apprendre';
  if (sujet.length > sujetMax) return `Ton sujet est trop long (${sujetMax} caractères au plus)`;
  return null;
}

// Question du Cadrage telle que l'écran la pose (#118). `question` est celle que le serveur sert pour `cle` ;
// avec un `sujet` connu (sujet tapé ou titre d'une Proposition), elle le nomme. En révision d'une leçon de classe,
// le sujet n'est pas encore connu : la question reste celle du serveur. Les réponses et les valeurs ne changent pas.
const QUESTIONS_AVEC_SUJET = {
  pourquoi: (sujet) => `Pourquoi veux-tu apprendre « ${sujet} » ?`,
  deja: (sujet) => `Sur « ${sujet} », tu en sais déjà…`,
};

export function questionCadrage({ cle, question, sujet }) {
  const nom = sujet?.trim();
  const avecSujet = QUESTIONS_AVEC_SUJET[cle];
  return nom && avecSujet ? avecSujet(nom) : question;
}
