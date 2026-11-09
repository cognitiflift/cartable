// Chargement et pannes (ticket #169), sans DOM : partagé par l'appli et testé à part.
// Trois décisions : une erreur d'API qui porte son statut, un indicateur d'attente seulement si le chargement traîne,
// et des lectures d'accueil qui échouent chacune pour son compte.

// Erreur levée par le client d'API. `statut` est le code HTTP, ou 0 quand le serveur n'a pas répondu (réseau).
export class ErreurApi extends Error {
  constructor(message, statut = 0) {
    super(message);
    this.name = 'ErreurApi';
    this.statut = statut;
  }
}

export const estIntrouvable = (e) => e instanceof ErreurApi && e.statut === 404;

// Lit le Profil de l'Élève : { profil } s'il existe, { absent: true } si le serveur dit qu'il est introuvable (404).
// Toute autre erreur (500, réseau) remonte, pour que l'écran dise la panne au lieu de renvoyer à « Qui es-tu ? ».
export async function chargerProfil(lire, slug) {
  if (!slug) return { absent: true };
  try {
    return { profil: await lire(slug) };
  } catch (e) {
    if (estIntrouvable(e)) return { absent: true };
    throw e;
  }
}

// Délai avant d'afficher l'indicateur d'attente. Aucun cadre vérifié : hypothèse à mesurer (docs/cadres-scientifiques.md).
export const DELAI_ATTENTE_MS = 400;

// Lance `travail` ; si elle dure plus de `delai` ms, appelle `afficher()`, puis `masquer()` à la fin, réussie ou non.
// Une réponse rapide n'affiche ni ne masque rien. `minuteur` ({ setTimeout, clearTimeout }) se remplace dans les tests.
export async function avecAttente(travail, { afficher, masquer, delai = DELAI_ATTENTE_MS, minuteur = globalThis } = {}) {
  let affiche = false;
  const id = minuteur.setTimeout(() => { affiche = true; afficher(); }, delai);
  try {
    return await travail();
  } finally {
    minuteur.clearTimeout(id);
    if (affiche) masquer();
  }
}

// Les lectures de l'accueil, chacune à part : { lecons: { valeur } | { erreur }, … }. Aucune ne fait échouer les autres.
export async function lireEnParallele(lectures) {
  const cles = Object.keys(lectures);
  const resultats = await Promise.allSettled(cles.map((cle) => lectures[cle]));
  return Object.fromEntries(cles.map((cle, i) => [cle, resultats[i].status === 'fulfilled'
    ? { valeur: resultats[i].value }
    : { erreur: resultats[i].reason }]));
}
