// Horloge du serveur (spec #47, ticket #65) : « maintenant » vaut l'heure réelle, sauf quand les tests ont rendu
// l'horloge injectable (CARTABLE_HORLOGE_INJECTABLE=1) ; une requête fixe alors la date par l'en-tête
// X-Cartable-Maintenant (date ISO), pour vérifier les révisions espacées sans attendre des jours.
// Le serveur lit « maintenant » une fois par requête et le passe aux fonctions pures (lib/memoire.js…).

export const ENTETE_MAINTENANT = 'x-cartable-maintenant'; // en-têtes Node : en minuscules

// « maintenant » (ms) pour une requête, d'après ses en-têtes (`req.headers`). Une date illisible est ignorée.
export function maintenantDe(entetes = {}, env = process.env) {
  if (env.CARTABLE_HORLOGE_INJECTABLE === '1') {
    const injecte = Date.parse(entetes[ENTETE_MAINTENANT] ?? '');
    if (!Number.isNaN(injecte)) return injecte;
  }
  return Date.now();
}
