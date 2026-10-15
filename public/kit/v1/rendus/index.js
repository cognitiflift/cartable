// Kit v1 — registre des rendus par type de question (spec #48), pendant DOM de ../types/index.js. Chaque rendu vit
// dans son propre fichier de ce dossier.
//
// Un rendu est une fonction (question validée, { quandPrete }) → { zone, figer(), montrerCorrection(correction) } :
//   zone : l'élément où l'Élève répond (question.js y ajoute « Je ne sais pas » à la fin, sauf pour un type
//     `souvenirDeclare`, qui n'a pas non plus de Confiance : il est corrigé dès sa réponse) ;
//   quandPrete(reponse) : à appeler quand l'Élève a donné sa réponse (propre au type, celle que corriger reçoit) ;
//     question.js fige alors la question et demande la Confiance ;
//   figer() : plus aucune modification possible (après la réponse ou « Je ne sais pas ») ;
//   montrerCorrection(correction) : marque ce qui est juste ou faux (`kit-bonne` / `kit-fausse`) d'après le résultat
//     de corriger ; sans `detail` (« Je ne sais pas »), il montre aussi la bonne réponse (reponseAttendue de
//     quiz-logique.js), comme le QCM marque la bonne. Le message et l'explication sont affichés par question.js.
// Les rendus où l'Élève compose sa réponse avant de la valider partagent leur bouton « Valider » et leur état figé
// (commun.js).
// Tout se fait avec des boutons : au toucher et au clavier, sans saisie de texte (ADR 0002).
import { rendreQcm } from './qcm.js';
import { rendreTrous } from './trous.js';
import { rendreOrdre } from './ordre.js';
import { rendreAssocier } from './associer.js';
import { rendreClasser } from './classer.js';
import { rendreEtapes } from './etapes.js';
import { rendreDevoile } from './devoile.js';
import { rendreExplication } from './explication.js';

export const RENDUS = {
  qcm: rendreQcm,
  trous: rendreTrous,
  ordre: rendreOrdre,
  associer: rendreAssocier,
  classer: rendreClasser,
  etapes: rendreEtapes,
  devoile: rendreDevoile,
  explication: rendreExplication,
};
