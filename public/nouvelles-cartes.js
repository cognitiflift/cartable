// Nouvelles cartes (spec #182, ticket #187), sans DOM : ce qui attend face cachée, ce que montrent les grilles tant
// qu'une carte n'est pas rangée, et les textes de l'écran. Une carte est « en attente » tant qu'elle n'est pas rangée :
// à retourner (serveur, `aRetourner`) ou retournée mais pas ajoutée (cette visite seulement, `nonRangees`).
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

// La collection que montre la grille : chaque Badge au plus haut Palier rangé ; une surprise en attente reste cachée.
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

// « Mon réseau » : les cartes de ligne retournées et rangées.
export const cartesLigneRangees = (cartesLigne, nonRangees) =>
  cartesLigne.filter((c) => c.retourne && !nonRangees.some((n) => n.type === 'ligne' && n.id === c.lecon));

// Les cartes du groupe « Nouvelles cartes » : d'abord celles qui attendent face cachée (leur médaillon dit le Badge, ou
// 🚉 pour une ligne, jamais le Palier), puis celles retournées et pas encore rangées.
export function nouvellesCartes({ aRetourner, collection, cartesLigne, nonRangees }) {
  const decrire = (carte, retournee) => {
    if (carte.type === 'ligne') {
      const l = cartesLigne.find((c) => c.lecon === carte.id);
      return l && { ...carte, cle: cleCarte(carte), retournee, medaillon: '🚉', ligne: l,
        libelle: retournee ? `Carte de ligne « ${l.titre} », retournée, à ajouter à ton réseau` : 'Une nouvelle carte, face cachée. Touche pour la retourner.' };
    }
    const b = collection.find((x) => x.id === carte.id);
    return b && { ...carte, cle: cleCarte(carte), retournee, medaillon: b.emoji, badge: b,
      libelle: retournee ? `${b.nom}, retournée, à ajouter à ta collection` : `Une nouvelle carte, face cachée, du badge ${b.nom}. Touche pour la retourner.` };
  };
  return [...aRetourner.map((c) => decrire(c, false)), ...nonRangees.map((c) => decrire(c, true))].filter(Boolean);
}

// Textes de la cérémonie et du réglage.
export const TEXTES_CEREMONIE = {
  titreGroupe: 'Nouvelles cartes',
  aide: 'Touche la carte pour la retourner.',
  ajouterBadge: 'Ajouter à ma collection',
  ajouterLigne: 'Ajouter à mon réseau',
  fermer: 'Plus tard',
  dialogue: (nom) => `Nouvelle carte : ${nom}`,
  reglageSon: ' 🔔 Carillon quand une carte se retourne (éteint tant que tu ne l’actives pas)',
};
