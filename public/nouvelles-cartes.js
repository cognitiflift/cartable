// Nouvelles cartes (spec #182, tickets #187 et #196), sans DOM : ce qui attend face cachée, ce que montrent les grilles
// et l'encart de Leçon de l'accueil, et les textes de l'écran. Une carte est « en attente » tant qu'elle n'est pas
// retournée (serveur, `aRetourner`) ; une fois retournée, elle est rangée d'office (plus d'étape « Ajouter »).
// Une carte : { type: 'ligne', id } ou { type: 'palier', id, palier }.

import { PALIERS } from './carte-badge-texte.js';

export const contientNouveau = (aRetourner) => (aRetourner?.length ?? 0) > 0;

export const cleCarte = (c) => (c.type === 'ligne' ? `ligne/${c.id}` : `palier/${c.id}/${c.palier}`);

// Le Badge tel qu'il était à ce Palier : les Paliers au-delà ne sont pas encore gagnés (pour la carte de la cérémonie
// et pour la grille tant que le Palier n'est pas rangé).
export function badgeAuPalier(b, palier) {
  if (b.surprise) return b;
  const rang = PALIERS.indexOf(palier);
  const paliers = b.paliers.map((p, i) => (i <= rang ? p : { ...p, jour: null }));
  const atteints = paliers.filter((p) => p.jour);
  const prochain = paliers.find((p) => !p.jour);
  return { ...b, paliers, palier: atteints.at(-1)?.palier ?? null, prochain: prochain ? { palier: prochain.palier, seuil: prochain.seuil } : null };
}

// La collection que montre la grille : chaque Badge au plus haut Palier retourné ; une surprise en attente reste cachée.
export function collectionRangee(collection, enAttente) {
  const paliers = enAttente.filter((c) => c.type === 'palier');
  return collection.flatMap((b) => {
    const mes = paliers.filter((c) => c.id === b.id);
    if (!mes.length) return [b];
    if (b.surprise) return [];
    const plusBas = Math.min(...mes.map((c) => PALIERS.indexOf(c.palier)));
    return [badgeAuPalier(b, PALIERS[plusBas - 1] ?? '')];
  });
}

// « Mon réseau » : les cartes de ligne retournées.
export const cartesLigneRangees = (cartesLigne) => cartesLigne.filter((c) => c.retourne);

// Les cartes du groupe « Nouvelles cartes » : celles qui attendent face cachée (leur médaillon dit le Badge, ou 🚉 pour
// une ligne, jamais le Palier).
export function nouvellesCartes({ aRetourner, collection, cartesLigne }) {
  const decrire = (carte) => {
    if (carte.type === 'ligne') {
      const l = cartesLigne.find((c) => c.lecon === carte.id);
      return l && { ...carte, cle: cleCarte(carte), medaillon: '🚉', ligne: l, libelle: LIBELLE_CACHEE };
    }
    const b = collection.find((x) => x.id === carte.id);
    return b && { ...carte, cle: cleCarte(carte), medaillon: b.emoji, badge: b,
      libelle: `Une nouvelle carte, face cachée, du badge ${b.nom}. Touche pour la retourner.` };
  };
  return aRetourner.map(decrire).filter(Boolean);
}

const LIBELLE_CACHEE = 'Une nouvelle carte, face cachée. Touche pour la retourner.';

// L'emplacement de carte de l'encart d'une Leçon sur l'accueil (#196), à trois états : `a-decouvrir` (aucune carte de
// ligne : pas Acquise, ou Acquise avant la livraison des cartes), `a-retourner` (carte gagnée, pas retournée ; `prete`
// dit si elle est composée, donc si on peut la retourner) et `rangee` (retournée : la carte de ligne de la Leçon).
export function emplacementCarte(cartesLigne, leconId) {
  const carte = cartesLigne.find((c) => c.lecon === leconId);
  if (!carte) return { etat: 'a-decouvrir' };
  if (carte.retourne) return { etat: 'rangee', carte };
  const prete = !!carte.calques;
  return { etat: 'a-retourner', carte, prete, medaillon: '🚉',
    libelle: prete ? LIBELLE_CACHEE : 'Une nouvelle carte, face cachée, en préparation. Elle sera prête dans un instant.' };
}

// Les cartes que ce gain propose face cachée (#197), sur l'écran du Retour de quiz ou de fin de Révision du jour : les
// Paliers annoncés (`paliers`, [{ id, palier }]) et les cartes de ligne annoncées (`lignes`, identifiants de Leçon), tant
// qu'elles attendent (relues sur la vue des cartes : retournée ailleurs, elle n'est plus proposée). Une carte de ligne
// est proposée prête ou non : `prete: false` ouvre l'attente de la cérémonie, qui relit l'état de la carte.
export function cartesDuGain({ paliers = [], lignes = [], aRetourner, collection, cartesLigne }) {
  const attend = (p) => aRetourner.some((c) => c.type === 'palier' && c.id === p.id && c.palier === p.palier);
  const duPalier = nouvellesCartes({ aRetourner: paliers.filter(attend).map((p) => ({ type: 'palier', id: p.id, palier: p.palier })), collection, cartesLigne });
  const deLigne = lignes.flatMap((id) => {
    const e = emplacementCarte(cartesLigne, id);
    if (e.etat !== 'a-retourner') return [];
    const carte = { type: 'ligne', id };
    return [{ ...carte, cle: cleCarte(carte), medaillon: e.medaillon, ligne: e.carte, libelle: e.libelle, prete: e.prete }];
  });
  return [...duPalier, ...deLigne];
}

// Durées de l'attente (ms), décidées au prototype #198 : un tour de boucle (esquisse en entier à `vitesse`×, fondu), le
// quart de tour de l'esquisse qui cède la place à la carte, la relecture de l'état de la carte, le délai maximal.
export const ATTENTE = { vitesse: 1.15, tour: 6800, fondu: 800, profil: 250, relecture: 2000, repli: 60_000 };

// Textes de la cérémonie et du réglage.
export const TEXTES_CEREMONIE = {
  titreGroupe: 'Nouvelles cartes',
  aide: 'Touche la carte pour la retourner.',
  fermer: 'Plus tard', // avant le retournement : la carte reste face cachée
  fermerRetournee: 'Fermer', // après : fermer range la carte d'office
  // L'attente d'une carte pas encore composée (#197) : un seul texte, sans chiffre (durée inconnue, pas de jauge).
  attente: 'Ta carte se prépare',
  attenteFixe: 'Ta carte se prépare', // sous mouvement réduit : esquisse fixe et complète
  pause: 'Mettre en pause', // libellé seul, sans aria-pressed
  reprendre: 'Reprendre',
  repli: 'Ta carte arrive, elle t’attend sur l’accueil.', // passé le délai maximal : calme, le dialogue reste ouvert
  fermerRepli: 'Fermer',
  propose: (n) => (n > 1 ? 'De nouvelles cartes t’attendent, à retourner quand tu veux.' : 'Une nouvelle carte t’attend, à retourner quand tu veux.'), // sur l'écran du gain (#197)
  dialogue: (nom) => `Nouvelle carte : ${nom}`,
  reglageSon: ' 🔔 Carillon quand une carte se retourne (éteint tant que tu ne l’actives pas)',
};
