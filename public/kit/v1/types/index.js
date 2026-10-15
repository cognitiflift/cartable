// Kit v1 — registre des types de questions (spec #48). Chaque type vit dans son propre fichier de ce dossier, sans DOM
// (le serveur l'importe aussi), et son rendu dans ../rendus/<type>.js. Pour ajouter un type : écrire ces deux fichiers,
// l'inscrire ici et dans ../rendus/index.js, et le documenter dans LISEZMOI.md.
//
// Un type est un objet :
//   valider(brut) → champs propres au type (ajoutés à id, type, enonce, explication, bonus, objectifs?, image?), ou null
//                   si la question est mal formée (elle est alors ignorée et signalée au prof, voir questionsIgnorees).
//   corriger(question, reponse) → { points, bonne, choisie, detail? } : `points` de 0 à 1 (crédit partiel), `bonne` et
//                   `choisie` en texte (pour le prof et les anciens lecteurs de résultats), `choisie` null si `reponse`
//                   n'est pas une réponse possible à cette question ; `detail` : la réponse détaillée, en données.
//                   `reponse` vaut null quand l'Élève a choisi « Je ne sais pas » (seul `bonne` sert alors).
//   lireDetail?(brut) → `detail` validé (reçu par l'appli dans un résultat), ou null pour l'écarter.
//   minoritaire?: true → sans bonne réponse vérifiable : ses questions restent moins nombreuses que les autres questions
//                   comptées dans le score (celles en trop sont ignorées, voir lireQuiz).
//   autoEvaluation?: true → l'Élève évalue lui-même sa réponse : ni Confiance ni « Je ne sais pas ».
// La réponse de l'Élève (`choix` de messageScore, `choisie` d'une Révision du jour) est propre au type, en JSON.
import { qcm } from './qcm.js';
import { trous } from './trous.js';
import { ordre } from './ordre.js';
import { associer } from './associer.js';
import { classer } from './classer.js';
import { etapes } from './etapes.js';
import { devoile } from './devoile.js';
import { explication } from './explication.js';

export const TYPES = {
  qcm,
  trous,
  ordre,
  associer,
  classer,
  etapes,
  devoile,
  explication,
};
