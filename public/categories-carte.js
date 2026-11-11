// Les Catégories des cartes (spec #182) : la table unique, partagée par le serveur (lib/carte-generique.js) et le client
// (public/carte-ligne-texte.js, public/carte-badge-art.js). Servie telle quelle par le serveur statique, importée par le
// serveur comme public/kit/v1 : un seul module, sans DOM. Une clé est celle du jeton `--ligne-<clé>`.

export const CATEGORIES_CARTE = ['francais', 'mathematiques', 'sciences', 'histoire', 'geographie', 'langues', 'arts', 'numerique'];

// « Géographie » → « geographie » ; une Catégorie inconnue ou absente prend la couleur « autre ».
export function cleCategorieCarte(categorie) {
  const cle = String(categorie ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return CATEGORIES_CARTE.includes(cle) ? cle : 'autre';
}
