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

// Carte d'attente, pendant que le prof prépare la Leçon après le Cadrage. `sujet` : sujet tapé ou titre de la
// Proposition, s'il est connu ; `mode` : 'libre' ou 'revision' (le sujet ne se connaît qu'après la lecture du document).
// Renvoie { titre, duree, ensuite } ; la suite annoncée est le Pré-test, dans les deux modes.
export function carteAttente({ sujet, mode }) {
  const nom = sujet?.trim();
  const titre = mode === 'revision' ? 'Ton prof lit ta leçon de classe et la prépare…'
    : nom ? `Ton prof prépare « ${nom} »…` : 'Ton prof prépare ta leçon…';
  return { titre, duree: 'Ça peut prendre quelques minutes.', ensuite: 'Ensuite : quelques questions pour deviner ce que tu sais déjà.' };
}

// Carte d'erreur, à la place de la carte d'attente quand la préparation échoue : le message du serveur, en mots simples,
// ou un message qui dit quoi faire quand il n'en donne pas. Renvoie { titre, message }.
export function carteErreur({ message }) {
  return { titre: "Ta leçon n'a pas pu se préparer", message: message?.trim() || "Ce n'est pas de ta faute. Tu peux réessayer, ou choisir autre chose." };
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
