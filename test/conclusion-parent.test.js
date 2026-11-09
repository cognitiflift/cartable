import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conclusionDesIndicateurs, MIN_REPONSES_CONCLUSION, SOUVENIR_BON, SOUVENIR_FAIBLE, RETOUR_BON, ECART_RAPPELS_BON,
} from '../public/conclusion-parent.js';

const vide = {
  souvenir: { reponses: 0, justes: 0, pourcentage: null },
  retour: { lecons: 0, revenus: 0, enAttente: 0, pourcentage: null },
  calibration: [{ de: 0, a: 100, reponses: 0, justes: 0, predit: null, pourcentage: null }],
};
// Prédit à 80 % en moyenne ; `calibration` est le pourcentage réellement juste.
const avec = (souvenir, retour, calibration) => ({
  souvenir: { reponses: MIN_REPONSES_CONCLUSION, justes: 0, pourcentage: souvenir },
  retour: { lecons: 3, revenus: 0, enAttente: 0, pourcentage: retour },
  calibration: [{ de: 0, a: 100, reponses: 40, justes: 0, predit: 80, pourcentage: calibration }],
});

test('Sans données : dit qu’il est trop tôt, sans chiffre ni sigle', () => {
  assert.equal(conclusionDesIndicateurs(vide), 'Pas encore assez d’activité pour dire si l’appli aide à retenir.');
});

test('Bonnes valeurs : révisions justes, retour, rappels au bon moment', () => {
  const phrase = conclusionDesIndicateurs(avec(SOUVENIR_BON, RETOUR_BON, 80 + ECART_RAPPELS_BON));
  assert.match(phrase, /Les Révisions du jour sont plutôt justes/);
  assert.match(phrase, /L’Élève revient/);
  assert.match(phrase, /Les rappels tombent au bon moment/);
});

test('Mauvaises valeurs : révisions ratées, retour rare, rappels mal placés', () => {
  const phrase = conclusionDesIndicateurs(avec(SOUVENIR_FAIBLE - 1, RETOUR_BON - 1, 80 - ECART_RAPPELS_BON - 1));
  assert.match(phrase, /souvent ratées/);
  assert.match(phrase, /ne revient pas toujours/);
  assert.match(phrase, /ne tombent pas encore au bon moment/);
});

test('Valeur entre les deux seuils : « à moitié justes »', () => {
  assert.match(conclusionDesIndicateurs(avec(SOUVENIR_FAIBLE, RETOUR_BON, 80)), /à moitié justes/);
});

test('Trop peu de réponses : pas de jugement sur les révisions ni sur les rappels', () => {
  const peu = avec(100, RETOUR_BON, 100);
  peu.souvenir.reponses = MIN_REPONSES_CONCLUSION - 1;
  peu.calibration[0].reponses = MIN_REPONSES_CONCLUSION - 1;
  assert.doesNotMatch(conclusionDesIndicateurs(peu), /Révisions du jour|rappels/);
});

test('Aucun sigle dans la phrase', () => {
  for (const s of [[100, 100, 80], [0, 0, 0]]) assert.doesNotMatch(conclusionDesIndicateurs(avec(...s)), /FSRS|USD|\$|tours?\b/);
});
