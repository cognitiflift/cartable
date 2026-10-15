// Kit v1 — rendu d'un texte à trous (spec #48, ticket #70) : la phrase avec ses trous, puis la banque de mots
// mélangée. Toucher un mot le place dans le trou sélectionné (au départ, le premier trou vide) ; toucher un trou rempli
// rend son mot à la banque, toucher un trou vide le sélectionne. « Valider » quand tous les trous sont remplis.
import { el } from '../dom.js';
import { melanger } from '../quiz-logique.js';
import { motsDe } from '../types/trous.js';

export function rendreTrous(q, { quandPrete }) {
  const mots = motsDe(q);
  const places = q.trous.map(() => null); // index du mot (dans `mots`) placé dans chaque trou
  let actif = 0;
  let fige = false;
  const premierVide = () => Math.max(0, places.indexOf(null));

  const cases = q.trous.map((_, i) => {
    const bouton = el('button', { type: 'button', className: 'kit-trou' });
    bouton.addEventListener('click', () => {
      if (places[i] !== null) places[i] = null;
      actif = i;
      rafraichir();
    });
    return bouton;
  });
  const boutonsMots = melanger(mots.length).map((j) => {
    const bouton = el('button', { type: 'button', className: 'kit-quiz-reponse kit-mot' }, mots[j]);
    bouton.addEventListener('click', () => {
      if (places.includes(j)) return;
      const trou = places[actif] === null ? actif : premierVide();
      places[trou] = j;
      actif = premierVide();
      rafraichir();
    });
    bouton.dataset.index = j;
    return bouton;
  });
  const valider = el('button', { type: 'button', className: 'kit-quiz-valider' }, '✔️ Valider');
  valider.addEventListener('click', () => {
    if (!places.includes(null)) quandPrete([...places]);
  });

  function rafraichir() {
    cases.forEach((c, i) => {
      c.textContent = places[i] === null ? '…' : mots[places[i]];
      c.setAttribute('aria-label', `Trou ${i + 1} : ${places[i] === null ? 'vide' : mots[places[i]]}`);
      c.classList.toggle('kit-trou-actif', !fige && i === actif);
      c.disabled = fige;
    });
    for (const b of boutonsMots) b.disabled = fige || places.includes(Number(b.dataset.index));
    valider.disabled = fige || places.includes(null);
  }
  rafraichir();

  const phrase = el('p', { className: 'kit-trous-phrase' }, ...q.segments.flatMap((s, i) => [s, cases[i] ?? null]));
  return {
    zone: el('div', { className: 'kit-quiz-reponses' }, phrase, el('div', { className: 'kit-trous-banque' }, ...boutonsMots), valider),
    figer: () => {
      fige = true;
      rafraichir();
      valider.hidden = true;
    },
    montrerCorrection: ({ detail }) => {
      if (!detail) return;
      cases.forEach((c, i) => c.classList.add(detail.places[i] === q.trous[i] ? 'kit-bonne' : 'kit-fausse'));
    },
  };
}
