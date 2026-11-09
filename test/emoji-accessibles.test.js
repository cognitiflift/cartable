import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

// Faux DOM minimal : de quoi construire des nœuds et lire leur arbre, sans navigateur.
class Noeud {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.enfants = []; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = v; }
  append(...e) { this.enfants.push(...e); }
  replaceChildren(...e) { this.enfants = e; }
  set textContent(t) { this.enfants = [String(t)]; }
}
globalThis.document = { createElement: (tag) => new Noeud(tag) };
const { decouperEmoji, avecEmoji, el, poser, nommer } = await import('../public/kit/v1/dom.js');

// Ce qu'un lecteur d'écran lit : tout sauf les nœuds aria-hidden.
const lu = (n) => (typeof n === 'string' ? n : n.attrs['aria-hidden'] === 'true' ? '' : n.enfants.map(lu).join(''));

test('Emoji : decouperEmoji sépare le texte et chaque emoji, variantes et assemblages compris', () => {
  assert.deepEqual(decouperEmoji('Bravo ✔️ Valider'), [
    { texte: 'Bravo ', emoji: false }, { texte: '✔️', emoji: true }, { texte: ' Valider', emoji: false }]);
  assert.deepEqual(decouperEmoji('👪 Vue'), [{ texte: '👪', emoji: true }, { texte: ' Vue', emoji: false }]);
  assert.deepEqual(decouperEmoji('👍🏽').map((m) => m.emoji), [true]);
  assert.deepEqual(decouperEmoji('Acquis ✓').at(-1), { texte: '✓', emoji: true });
  assert.deepEqual(decouperEmoji('Aucun emoji ici'), [{ texte: 'Aucun emoji ici', emoji: false }]);
});

test('Emoji : un texte sans emoji reste une chaîne ; avec emoji, chaque emoji est dans un span aria-hidden', () => {
  assert.equal(avecEmoji('Simple'), 'Simple');
  const [avant, e, apres] = avecEmoji('Revoir 👁 ici');
  assert.equal(avant, 'Revoir ');
  assert.equal(e.tag, 'span');
  assert.equal(e.attrs['aria-hidden'], 'true');
  assert.equal(apres, ' ici');
});

test('Emoji : el et poser cachent les emoji ; le nom du bouton reste son texte', () => {
  assert.equal(lu(el('button', {}, '✔️ Valider')).trim(), 'Valider');
  assert.equal(lu(poser(el('button'), '🔊 Écouter')).trim(), 'Écouter');
  assert.equal(lu(poser(el('button'), '⏹ Arrêter')).trim(), 'Arrêter');
});

test('Emoji : un emoji porteur de sens garde un nom textuel masqué visuellement (classe cache)', () => {
  const noeud = el('span', {}, nommer('⭐ 3', 'Pages réussies : 3'));
  assert.equal(lu(noeud), 'Pages réussies : 3');
  assert.equal(noeud.enfants[1].className, 'cache');
});

// Exceptions : fichier → nombre de lignes tolérées. On en retire, on n'en ajoute pas.
const EXCEPTIONS = {};

// Les emoji qui ne passent ni par h/el/poser : attributs (title, aria-label…), innerHTML, textContent direct.
const EMOJI = String.raw`(?:\p{Extended_Pictographic}|[✓✕])`;
const DANS_UNE_CHAINE = String.raw`([\x27"\x60])(?:(?!\1).)*?${EMOJI}`; // un emoji dans la chaîne littérale qui suit
const FUITES = new RegExp(
  String.raw`(?:\.textContent\s*=|\.innerHTML\s*=)[^\n]*${EMOJI}` // textContent / innerHTML posés d'un bloc
  + String.raw`|\b(?:title|ariaLabel|placeholder|alt)\s*:\s*${DANS_UNE_CHAINE}`
  + String.raw`|setAttribute\(\s*['"](?:aria-label|title|placeholder|alt)['"]\s*,\s*${DANS_UNE_CHAINE}`, 'u');
const sansCommentaire = (ligne) => ligne.replace(/\s\/\/.*$/, '').trim();

async function fichiersJs(dossier) {
  const sortie = [];
  for (const e of await readdir(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) sortie.push(...await fichiersJs(chemin));
    else if (e.name.endsWith('.js')) sortie.push(chemin);
  }
  return sortie;
}

test('Emoji : aucun emoji dans un attribut, un innerHTML ou un textContent direct (sauf exceptions)', async () => {
  const trouves = [];
  for (const fichier of await fichiersJs('public')) {
    const lignes = (await readFile(fichier, 'utf8')).split('\n');
    lignes.forEach((l, i) => {
      const code = sansCommentaire(l);
      if (!code.startsWith('//') && !code.startsWith('*') && FUITES.test(code)) trouves.push(`${fichier}:${i + 1} ${code.slice(0, 100)}`);
    });
  }
  const parFichier = {};
  for (const t of trouves) parFichier[t.split(':')[0]] = (parFichier[t.split(':')[0]] ?? 0) + 1;
  for (const [fichier, n] of Object.entries(parFichier)) {
    assert.ok(n <= (EXCEPTIONS[fichier] ?? 0), `Emoji hors aria-hidden dans ${fichier} : ${trouves.filter((t) => t.startsWith(fichier)).join(' | ')}. Passe-les par h/el/poser (public/kit/v1/dom.js), ou nomme-les (nommer).`);
  }
});
