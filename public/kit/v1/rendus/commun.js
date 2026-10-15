// Kit v1 — ce que partagent les rendus où l'Élève compose sa réponse avant de la valider (trous, ordre, associer,
// classer, etapes) : le bouton « Valider » et l'état figé.
import { el } from '../dom.js';

// `reponse()` : la réponse complète (celle que corriger reçoit), ou null tant qu'il manque quelque chose ;
// `rafraichir()` : redessine le rendu (il lit `fige` et appelle `actualiser()`).
// Renvoie { bouton, fige, actualiser(), figer() } : `actualiser` n'active « Valider » que pour une réponse complète,
// `figer` (le figer() du rendu) bloque toute modification puis redessine, sans « Valider ».
export function validation({ quandPrete, reponse, rafraichir }) {
  let fige = false;
  const bouton = el('button', { type: 'button', className: 'kit-quiz-valider' }, '✔️ Valider');
  bouton.addEventListener('click', () => {
    const r = reponse();
    if (r !== null) quandPrete(r);
  });
  return {
    bouton,
    get fige() {
      return fige;
    },
    actualiser: () => {
      bouton.disabled = fige || reponse() === null;
    },
    figer: () => {
      fige = true;
      rafraichir();
      bouton.hidden = true;
    },
  };
}
