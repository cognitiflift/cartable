// Kit v1 — petit outil DOM partagé par le rendu des questions (question.js et rendus/) et par l'appli (#168).
//
// Les emoji décoratifs ne sont pas lus par les lecteurs d'écran : tout texte posé par `el`, `poser` ou `avecEmoji`
// voit ses emoji enveloppés dans <span aria-hidden="true">. Un emoji qui porte un sens (⭐ « Pages réussies ») ne se
// cache pas seul : on lui donne un nom textuel masqué visuellement (`nommer`, classe .cache).

// Un emoji et ce qui le prolonge : variante d'affichage, teinte de peau, assemblage (👪), plus deux signes de l'interface.
const EMOJI = /(?:\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*|[✓✕])/gu;

// Texte découpé en morceaux { texte, emoji }, dans l'ordre ; les emoji voisins ne font qu'un morceau.
export function decouperEmoji(texte) {
  const morceaux = [];
  let fin = 0;
  for (const m of String(texte).matchAll(EMOJI)) {
    if (m.index > fin) morceaux.push({ texte: texte.slice(fin, m.index), emoji: false });
    morceaux.push({ texte: m[0], emoji: true });
    fin = m.index + m[0].length;
  }
  if (fin < texte.length) morceaux.push({ texte: texte.slice(fin), emoji: false });
  return morceaux;
}

// Un emoji décoratif : masqué aux lecteurs d'écran.
export const emoji = (texte) => {
  const n = document.createElement('span');
  n.setAttribute('aria-hidden', 'true');
  n.append(texte);
  return n;
};

// Un texte devient ses morceaux : le texte en nœud de texte, chaque emoji en <span aria-hidden>. Sans emoji, le texte tel quel.
export const avecEmoji = (texte) => {
  if (typeof texte !== 'string') return texte;
  const morceaux = decouperEmoji(texte);
  if (!morceaux.some((m) => m.emoji)) return texte;
  return morceaux.map((m) => (m.emoji ? emoji(m.texte) : m.texte));
};

// Remplace le contenu d'un nœud par un texte, emoji masqués.
export const poser = (noeud, texte) => {
  noeud.replaceChildren(...[avecEmoji(texte)].flat());
  return noeud;
};

// Un contenu visible (emoji compris) et son nom pour les lecteurs d'écran : le contenu est masqué, le nom ne se voit pas.
export const nommer = (visible, nom) => {
  const v = document.createElement('span');
  v.setAttribute('aria-hidden', 'true');
  v.append(...[avecEmoji(visible)].flat());
  const n = document.createElement('span');
  n.className = 'cache';
  n.append(nom);
  return [v, n];
};

export const el = (tag, attrs = {}, ...enfants) => {
  const n = Object.assign(document.createElement(tag), attrs);
  n.append(...enfants.filter((e) => e != null).flatMap((e) => [avecEmoji(e)].flat()));
  return n;
};
