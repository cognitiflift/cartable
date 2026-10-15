// Kit v1 — registre des rendus par type de question (spec #48), pendant DOM de ../types/index.js. Chaque rendu vit
// dans son propre fichier de ce dossier.
//
// Un rendu est une fonction (question validée, { quandPrete }) → { zone, figer(), montrerCorrection(correction) } :
//   zone : l'élément où l'Élève répond (question.js y ajoute « Je ne sais pas » à la fin) ;
//   quandPrete(reponse) : à appeler quand l'Élève a donné sa réponse (propre au type, celle que corriger reçoit) ;
//     question.js fige alors la question et demande la Confiance ;
//   figer() : plus aucune modification possible (après la réponse ou « Je ne sais pas ») ;
//   montrerCorrection(correction) : marque ce qui est juste ou faux (`kit-bonne` / `kit-fausse`) d'après le résultat
//     de corriger (sans `detail` après « Je ne sais pas ») ; le message et l'explication sont affichés par question.js.
// Tout se fait avec des boutons : au toucher et au clavier, sans saisie de texte (ADR 0002).
import { rendreQcm } from './qcm.js';
import { rendreTrous } from './trous.js';
import { rendreOrdre } from './ordre.js';

export const RENDUS = {
  qcm: rendreQcm,
  trous: rendreTrous,
  ordre: rendreOrdre,
};
