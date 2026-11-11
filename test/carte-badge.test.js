import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aFeuilleHolo, crans, dosCarteBadge, libelleCarteBadge, libelleADecouvrir, prochainEnMots, rangDeCarte, rangerCollection } from '../public/carte-badge-texte.js';
import { artDeBadge, ARTS_SURPRISES, IDS_FAMILLES } from '../public/carte-badge-art.js';
import { FAMILLES, SURPRISES } from '../lib/badges.js';

const dire = (j) => `le ${j}`;
const PAL = ['bronze', 'argent', 'or', 'diamant'];
const famille = (palier, surplus = {}) => {
  const paliers = PAL.map((p, i) => ({ palier: p, seuil: i + 1, jour: i <= PAL.indexOf(palier) ? `2026-11-0${i + 1}` : null }));
  const prochain = paliers.find((p) => !p.jour);
  return { id: 'memoire', emoji: '🧠', nom: 'Mémoire', phrase: 'Les Objectifs qui restent en mémoire.', palier, paliers, prochain: prochain && { palier: prochain.palier, seuil: prochain.seuil }, avance: 0.5, ...surplus };
};
const surprise = { id: 'mission-elargie', emoji: '🗺️', nom: 'Mission élargie', surprise: true, palier: 'unique', jour: '2026-11-05' };

test('Carte de Badge : le Palier atteint donne le rang et les crans allumés', () => {
  assert.equal(rangDeCarte(famille('bronze')), 1);
  assert.equal(rangDeCarte(famille('diamant')), 4);
  assert.deepEqual(crans(famille('argent')), [true, true, false, false]);
  assert.deepEqual(crans(surprise), [true]);
});

test('Carte de Badge : la feuille holographique est réservée à l\'or et au diamant', () => {
  assert.deepEqual(PAL.map((p) => aFeuilleHolo(famille(p))), [false, false, true, true]);
  assert.equal(aFeuilleHolo(surprise), false);
});

test('Carte de Badge : le dos dit ce que le Badge salue, la date et le prochain Palier en mots, sans chiffre', () => {
  const dos = dosCarteBadge(famille('argent'), dire);
  assert.equal(dos.salue, 'Les Objectifs qui restent en mémoire.');
  assert.equal(dos.date, 'Obtenu le 2026-11-02.');
  assert.equal(dos.prochain, 'Prochain Palier : or.');
  assert.equal(prochainEnMots(famille('diamant')), 'Tous les Paliers sont obtenus.');
  assert.match(prochainEnMots(surprise), /surprise/);
  assert.doesNotMatch(dos.prochain, /\d|%/);
});

test('Carte de Badge : le libellé lu à voix haute dit nom, Palier, date et ce qui est salué, pas le dessin', () => {
  assert.equal(libelleCarteBadge(famille('or'), dire), 'Mémoire, Palier or, obtenu le 2026-11-03. Les Objectifs qui restent en mémoire.');
  assert.match(libelleCarteBadge(surprise, dire, true), /badge surprise.*\(nouveau\)/);
  assert.match(libelleADecouvrir({ nom: 'Curieux', phrase: 'Les bonnes réponses.' }), /à découvrir/);
});

test('Mes Badges : cartes obtenues (la plus récente d\'abord, puis les surprises), À découvrir sans les surprises cachées', () => {
  const vide = { ...famille('bronze'), id: 'curieux', palier: null, paliers: famille('bronze').paliers.map((p) => ({ ...p, jour: null })), prochain: { palier: 'bronze', seuil: 1 } };
  const recente = { ...famille('argent'), id: 'regulier', paliers: famille('argent').paliers.map((p) => (p.jour ? { ...p, jour: '2026-11-09' } : p)) };
  const { obtenues, aDecouvrir } = rangerCollection([famille('bronze'), vide, recente, surprise]);
  assert.deepEqual(obtenues.map((b) => b.id), ['regulier', 'memoire', 'mission-elargie']);
  assert.deepEqual(aDecouvrir.map((b) => b.id), ['curieux']);
});

test('Dessins : une carte par Famille et par surprise, trois calques, jetons seulement, sans police', () => {
  assert.deepEqual([...IDS_FAMILLES].sort(), FAMILLES.map((f) => f.id).sort());
  const badges = [...FAMILLES.map((f) => ({ id: f.id, emoji: f.emoji })), ...SURPRISES.map((s) => ({ id: s.id, emoji: s.emoji, surprise: true }))];
  assert.equal(badges.length, FAMILLES.length + SURPRISES.length);
  for (const b of badges) for (const rang of [1, 2, 3, 4]) {
    const art = artDeBadge(b, rang);
    for (const calque of ['l1', 'l2', 'heros']) {
      const svg = art[calque];
      assert.match(svg, /^<svg viewBox="0 0 200 280"/, `${b.id} ${calque}`);
      assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b|rgb\(|font-family|<image|<script|href/i, `${b.id} ${calque}`);
      for (const c of svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)) assert.match(c[1], /^(none|var\(--[a-z-]+\))$/, `${b.id} ${calque}`);
    }
  }
});

test('Dessins : un Palier plus haut enrichit le dessin', () => {
  const b = { id: 'etoiles', emoji: '⭐' };
  const taille = (rang) => Object.values(artDeBadge(b, rang)).join('').length;
  assert.ok(taille(2) > taille(1) && taille(4) > taille(2));
  assert.equal(artDeBadge(b, 3).heros, artDeBadge(b, 3).heros);
});

test('Dessins : les couleurs employées sont des jetons de DESIGN.md', async () => {
  const design = await readFile(new URL('../DESIGN.md', import.meta.url), 'utf8');
  const jetons = new Set([...design.matchAll(/^ {2}([a-z-]+): "#/gm)].map((m) => m[1]));
  for (const f of IDS_FAMILLES) for (const rang of [1, 4]) for (const svg of Object.values(artDeBadge({ id: f, emoji: '' }, rang)))
    for (const m of svg.matchAll(/var\(--([a-z-]+)\)/g)) assert.ok(jetons.has(m[1]), `${f} : --${m[1]} n'est pas un jeton`);
});

test('Dessins des surprises : chaque identifiant a son dessin, et deux surprises n\'ont jamais les mêmes calques', () => {
  assert.deepEqual(Object.keys(ARTS_SURPRISES).sort(), SURPRISES.map((s) => s.id).sort());
  const parCalque = { l1: new Set(), l2: new Set(), heros: new Set() };
  for (const s of SURPRISES) {
    const art = artDeBadge({ id: s.id, emoji: s.emoji, surprise: true }, 4);
    for (const c of Object.keys(parCalque)) parCalque[c].add(art[c]);
    assert.doesNotMatch(art.heros, /<text/, `${s.id} : le héros est dessiné, pas un emoji`);
  }
  assert.equal(parCalque.heros.size, SURPRISES.length);
  assert.equal(parCalque.l1.size, SURPRISES.length);
  // Un identifiant inconnu retombe sur le dessin commun.
  assert.match(artDeBadge({ id: 'inconnue', emoji: '🎁', surprise: true }, 4).heros, /🎁/);
});
