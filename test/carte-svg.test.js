import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrerCalque, lireCalques, TAILLE_MAX } from '../lib/carte-svg.js';

const ID = '0001-volcans';
const svg = (interieur) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280">${interieur}</svg>`;
const bon = svg(`<defs><linearGradient id="${ID}-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--nuit)"/><stop offset="1" stop-color="var(--ligne-sciences)" stop-opacity="0.8"/></linearGradient></defs>`
  + `<rect width="200" height="280" fill="url(#${ID}-ciel)"/><g class="pc-a-flamme" style="transform-origin:100px 120px"><path d="M10 20 L-30 250.5 Z" fill="var(--rouge)" stroke="none" stroke-width="2" transform="rotate(10 5 5)"/></g>`
  + `<circle cx="20" cy="30" r="3" fill="var(--nouveau)" class="pc-a-scintille" style="animation-delay:1.3s"/>`);
const refuse = (s, motif) => {
  const r = filtrerCalque(s, ID);
  assert.equal(r.ok, false, `devait être refusé : ${s}`);
  assert.match(r.erreurs.join(' | '), motif);
};

test('un calque conforme est accepté et rendu tel quel', () => {
  assert.deepEqual(filtrerCalque(bon, ID), { ok: true, svg: bon, erreurs: [] });
});

test('éléments hors liste blanche refusés', () => {
  for (const el of ['text', 'image', 'filter', 'mask', 'clipPath', 'foreignObject', 'script', 'use', 'style', 'a', 'animate']) {
    refuse(svg(`<${el}></${el}>`), /élément/);
  }
  refuse(svg('<svg></svg>'), /élément/); // pas de svg imbriqué
});

test('attributs hors liste blanche refusés', () => {
  refuse(svg('<rect onclick="x()" width="1"/>'), /attribut/);
  refuse(svg('<rect href="x" width="1"/>'), /attribut/);
  refuse(svg('<rect filter="url(#x)" width="1"/>'), /attribut/);
  refuse(svg('<rect clip-path="x" width="1"/>'), /attribut/);
});

test('couleurs : seulement var(--jeton connu), none ou un dégradé de la carte', () => {
  for (const c of ['#fff', 'red', 'rgb(1,2,3)', 'var(--inconnu)', 'var(--nuit, red)', 'currentColor']) refuse(svg(`<rect width="1" fill="${c}"/>`), /couleur/);
  refuse(svg('<rect width="1" stroke="#000"/>'), /couleur/);
  refuse(svg('<defs><linearGradient id="0001-volcans-a"><stop offset="0" stop-color="#000"/></linearGradient></defs>'), /couleur/);
  refuse(svg('<rect width="1" fill="url(#absent)"/>'), /couleur/);
  refuse(svg('<rect width="1" fill="url(#0001-volcans-absent)"/>'), /dégradé/); // jamais défini dans le calque
});

test('classes d’animation hors liste fermée refusées', () => {
  refuse(svg('<g class="pc-a-clignote"/>'), /classe/);
  refuse(svg('<g class="pc-a-tourne autre"/>'), /classe/);
});

test('identifiants mal préfixés refusés', () => {
  refuse(svg('<defs><linearGradient id="ciel"/></defs>'), /id/);
  refuse(svg('<defs><linearGradient id="0002-autre-ciel"/></defs>'), /id/);
});

test('URL, script et données refusés', () => {
  refuse(svg('<rect width="1" fill="url(http://x.test/a.svg)"/>'), /couleur/);
  refuse(svg('<rect width="1" transform="url(#x)"/>'), /transform/);
  refuse(svg('<rect width="1" style="background:url(http://x.test)"/>'), /style/);
  refuse(svg('<path d="javascript:alert(1)"/>'), /d/);
  refuse(svg('<rect width="1" xmlns="http://evil.test"/>'), /xmlns/);
});

test('style limité à transform-origin et animation-delay (et --x)', () => {
  refuse(svg('<rect width="1" style="fill:red"/>'), /style/);
  refuse(svg('<rect width="1" style="animation:spin 1s"/>'), /style/);
  assert.equal(filtrerCalque(svg('<rect width="1" class="pc-a-braise" style="--x:12px;animation-delay:0.8s"/>'), ID).ok, true);
});

test('texte, commentaire, CDATA et balise illisible refusés', () => {
  refuse(svg('bonjour'), /texte/);
  refuse(svg('<!-- c --><rect width="1"/>'), /balise/);
  refuse(svg('<![CDATA[x]]>'), /balise/);
  refuse(svg("<rect width='1'/>"), /balise/);
  refuse(`${bon}<rect/>`, /racine/); // rien après la racine
  refuse('<rect width="1"/>', /racine/);
  refuse(svg('<g><rect width="1"/>'), /imbrication/);
  refuse(svg('<g></path></g>'), /imbrication/);
});

test('taille bornée', () => {
  refuse(svg(`<path d="M0 0 ${'L1 1 '.repeat(TAILLE_MAX)}"/>`), /taille/);
  refuse(42, /chaîne/);
});

test('lireCalques : un objet JSON à trois calques conformes, tolère un bloc de code', () => {
  const objet = { l1: bon, l2: svg(''), heros: svg('<circle cx="1" cy="1" r="1"/>') };
  assert.deepEqual(lireCalques(JSON.stringify(objet), ID), { ok: true, calques: objet, erreurs: [] });
  assert.equal(lireCalques('```json\n' + JSON.stringify(objet) + '\n```', ID).ok, true);
});

test('lireCalques : refuse un JSON illisible, un calque manquant, un calque refusé, un total trop gros', () => {
  assert.equal(lireCalques('pas du json', ID).ok, false);
  assert.equal(lireCalques(JSON.stringify({ l1: bon, l2: bon }), ID).ok, false);
  const r = lireCalques(JSON.stringify({ l1: bon, l2: bon, heros: svg('<text/>') }), ID);
  assert.equal(r.ok, false);
  assert.match(r.erreurs.join(' '), /heros/);
  const gros = svg(`<path d="M0 0 ${'L1 1 '.repeat(1500)}"/>`);
  const t = lireCalques(JSON.stringify({ l1: gros, l2: gros, heros: gros }), ID);
  assert.equal(t.ok, false);
  assert.match(t.erreurs.join(' '), /taille/);
});
