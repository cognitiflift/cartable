import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleCategorieCarte, objectifsDeCarte, libelleCarteLigne, calquesDeCarte, dosCarteLigne } from '../public/carte-ligne-texte.js';

const carte = (surcharge = {}) => ({
  lecon: 'b', titre: 'Les volcans', categorie: 'Sciences', objectifs: 3, jourAcquisition: '2026-11-11',
  etat: 'prete', essais: 1, calques: { l1: '<svg>1</svg>', l2: '<svg>2</svg>', heros: '<svg>h</svg>' }, prete: 'x', retourne: 'y', ...surcharge,
});
const le = (jour) => `le ${jour}`;

test('La couleur de la carte est celle de la Catégorie, sans accent ; une Catégorie inconnue prend « autre »', () => {
  assert.equal(cleCategorieCarte('Sciences'), 'sciences');
  assert.equal(cleCategorieCarte('Géographie'), 'geographie');
  assert.equal(cleCategorieCarte('Français'), 'francais');
  assert.equal(cleCategorieCarte('Cuisine'), 'autre');
  assert.equal(cleCategorieCarte(undefined), 'autre');
});

test('Une station par Objectif, toutes Retenues ; au moins une station même si le compte manque', () => {
  const l = objectifsDeCarte(4);
  assert.equal(l.length, 4);
  assert.ok(l.every((o) => o.atteint && o.retenu));
  assert.equal(objectifsDeCarte(0).length, 1);
  assert.equal(objectifsDeCarte(undefined).length, 1);
});

test('Le libellé dit le nom, la Catégorie, la date et ce que la carte salue, sans décrire le dessin', () => {
  assert.equal(libelleCarteLigne(carte(), le), 'Carte de la ligne « Les volcans », Sciences : Leçon acquise le 2026-11-11, 3 Objectifs Retenus.');
  assert.equal(libelleCarteLigne(carte({ objectifs: 1 }), le), 'Carte de la ligne « Les volcans », Sciences : Leçon acquise le 2026-11-11, 1 Objectif Retenu.');
});

test('Les calques d\'une carte prête sont ceux de l\'agent, tels quels', () => {
  const c = carte();
  assert.deepEqual(calquesDeCarte(c), c.calques);
});

test('Une carte sans les trois calques échoue visiblement : le serveur les fournit toujours, scène générique comprise', () => {
  assert.throws(() => calquesDeCarte(carte({ etat: 'generique', calques: null })), /sans calques/);
  assert.throws(() => calquesDeCarte(carte({ calques: { l1: '<svg/>', l2: '', heros: '<svg/>' } })), /sans calques/);
});

test('Le dos : cartouche de la Catégorie, nom, ce que la carte salue, date', () => {
  assert.deepEqual(dosCarteLigne(carte(), le), {
    cartouche: 'Sciences', nom: 'Les volcans',
    salue: 'Tous les Objectifs sont Retenus : la ligne est allée jusqu\'au terminus.',
    date: 'Acquise le 2026-11-11.',
  });
});
