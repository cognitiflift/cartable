// Accord en nombre des textes de l'appli : chaque mot prend un « s » au-delà de un.
// accorder(2, 'question juste') = « questions justes » ; pluriel(2, 'réponse') = « 2 réponses ».
export const accorder = (n, mots) => (n > 1 ? mots.split(' ').map((m) => `${m}s`).join(' ') : mots);
export const pluriel = (n, mots) => `${n} ${accorder(n, mots)}`;
