import { pluriel } from './pluriel.js';

// Pré-test (spec #46) : écart entre ce que l'Élève pensait savoir (« Tu en sais déjà… » du Cadrage) et ce qu'il a
// trouvé. L'auto-évaluation seule est peu fiable chez l'enfant : l'écart sert à la lui montrer, avec bienveillance,
// jamais à décider seule de la suite.

// Niveau annoncé par « Tu en sais déjà… », de 0 à 3, et sa tournure dans « Tu pensais … ». « Je ne sais pas » : aucun.
const ANNONCES = {
  rien: { niveau: 0, tournure: 'découvrir ce sujet' },
  'un-peu': { niveau: 1, tournure: 'en savoir un peu' },
  beaucoup: { niveau: 2, tournure: 'en savoir beaucoup' },
  incollable: { niveau: 3, tournure: 'être incollable' },
};

// Niveau montré par le Pré-test, de 0 à 3, d'après la part de réponses justes : aucune, moins de la moitié, au moins
// la moitié, toutes. Avec trois questions : 0, 1, 2 ou 3 justes.
const niveauTrouve = (justes, total) => (justes === 0 ? 0 : justes < total / 2 ? 1 : justes < total ? 2 : 3);

const SUITES = {
  plus: 'tu en sais plus que tu ne le croyais ! 🌟',
  moins: "c'est normal de deviner avant d'apprendre, ce Pré-test aide ton prof à choisir par où commencer. 🌱",
  'comme-prevu': 'tu te connais bien ! 👍',
};

// `deja` : réponse à « Tu en sais déjà… » (absente pour une Leçon sans Cadrage) ; `justes` / `total` : questions du
// Pré-test, hors bonus. { deja, justes, total, ecart: 'plus' | 'moins' | 'comme-prevu' | null, texte } ; null sans question.
export function ecartPretest({ deja = null, justes, total }) {
  if (!total) return null;
  const trouve = `tu as trouvé ${pluriel(justes, 'réponse')} sur ${total}`;
  const annonce = ANNONCES[deja];
  if (!annonce) return { deja, justes, total, ecart: null, texte: `T${trouve.slice(1)} avant même la leçon. 🔮` };
  const difference = niveauTrouve(justes, total) - annonce.niveau;
  const ecart = difference > 0 ? 'plus' : difference < 0 ? 'moins' : 'comme-prevu';
  return { deja, justes, total, ecart, texte: `Tu pensais ${annonce.tournure}, et ${trouve} : ${SUITES[ecart]}` };
}
