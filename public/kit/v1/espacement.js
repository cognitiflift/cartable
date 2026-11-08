// Kit v1 — espacement des lettres (spec #145, ticket #160). L'appli transmet le réglage du Profil à la page dans son
// adresse : `…/0002-le-magma.html?espacement=1`. Le Kit pose alors la classe `kit-espacement` sur <html> ; la feuille
// quiz.css fait le reste. Sans le réglage, rien ne change.
export const espacementActif = (recherche) => new URLSearchParams(recherche).get('espacement') === '1';

export function appliquerEspacement(doc, recherche) {
  if (espacementActif(recherche)) doc.documentElement.classList.add('kit-espacement');
}
