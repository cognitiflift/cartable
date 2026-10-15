// Kit v1 — type `explication` (spec #48, ticket #72) : « choisis la meilleure explication ». Un cas particulier de QCM :
// l'énoncé pose un « pourquoi ? », les réponses sont plusieurs explications du phénomène, une seule juste (les autres
// plausibles : idées reçues, confusions fréquentes). L'Élève s'explique les choses sans écrire.
// Mêmes champs, même correction et même réponse de l'Élève qu'un QCM (voir qcm.js). Son type le signale au rendu
// (consigne « Choisis la meilleure explication ») et au prof : c'est une reconnaissance, pas une question de rappel actif.
import { qcm } from './qcm.js';

export const explication = { ...qcm };
