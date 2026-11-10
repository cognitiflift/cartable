---
name: Cartable
description: Le plan du réseau de l'Élève, où chaque Leçon est une ligne et chaque Objectif une station.
colors:
  fond: "#f2f4f8"
  carte: "#ffffff"
  texte: "#14182b"
  doux: "#4f566c"
  bord: "#dde1ea"
  nuit: "#14182b"
  sur-nuit: "#ffffff"
  sur-nuit-doux: "#c3c8db"
  accent: "#262a7a"
  sur-accent: "#ffffff"
  nouveau: "#fbbf24"
  sur-nouveau: "#14182b"
  retenu: "#15803d"
  sur-retenu: "#ffffff"
  station-vide: "#80879a"
  troncon: "#dde1ea"
  station-atteinte: "#ffffff"
  hachure: "#ffffff"
  encre-noire: "#000000"
  voile: "rgb(20 24 43 / .5)"
  rouge: "#b42318"
  orange: "#a8530b"
  vert: "#15803d"
  palier-bronze: "#9a5a24"
  palier-argent: "#6b7684"
  palier-or: "#9a7206"
  palier-diamant: "#1f7fb3"
  palier-unique: "#8e44ad"
  ligne-francais: "#c2410c"
  ligne-mathematiques: "#2f6fed"
  ligne-sciences: "#0f8a6a"
  ligne-histoire: "#8a5a14"
  ligne-geographie: "#0e7490"
  ligne-langues: "#9333ea"
  ligne-arts: "#db2777"
  ligne-autre: "#4b5563"
  fond-sombre: "#0f1220"
  carte-sombre: "#1a1e30"
  texte-sombre: "#e8eaf3"
  doux-sombre: "#a6acc2"
  bord-sombre: "#2c3248"
  sur-nuit-doux-sombre: "#a6acc2"
  accent-sombre: "#b9c3ff"
  sur-accent-sombre: "#0f1220"
  nouveau-sombre: "#fcd34d"
  sur-nouveau-sombre: "#0f1220"
  retenu-sombre: "#34c463"
  sur-retenu-sombre: "#0f1220"
  station-vide-sombre: "#737a96"
  troncon-sombre: "#2f3550"
  hachure-sombre: "#d9dce6"
  voile-sombre: "rgb(0 0 0 / .65)"
  rouge-sombre: "#f58b8b"
  orange-sombre: "#f5b14c"
  vert-sombre: "#5ad98a"
  palier-bronze-sombre: "#d99a62"
  palier-argent-sombre: "#b6c0cb"
  palier-or-sombre: "#e8c04a"
  palier-diamant-sombre: "#6cc4ef"
  palier-unique-sombre: "#c792e6"
  ligne-francais-sombre: "#fb923c"
  ligne-mathematiques-sombre: "#7aa2ff"
  ligne-sciences-sombre: "#34d399"
  ligne-histoire-sombre: "#e0a75e"
  ligne-geographie-sombre: "#38bdf8"
  ligne-langues-sombre: "#c084fc"
  ligne-arts-sombre: "#f472b6"
  ligne-autre-sombre: "#9ca3af"
typography:
  display:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  display-mobile:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title-mobile:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title-categorie:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  marque:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  body-petit:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 700
    lineHeight: 1.3
  label-signaletique:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.74rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.07em"
  label-niveau:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  chiffres:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    fontFeature: "tnum"
rounded:
  puce: "6px"
  niveau: "7px"
  terminus: "8px"
  champ: "10px"
  bouton: "12px"
  carte: "14px"
  carte-ligne: "18px"
  pilule: "999px"
  rond: "50%"
spacing:
  serre: "0.35rem"
  petit: "0.6rem"
  moyen: "1rem"
  carte-ligne: "1.05rem 1.25rem 0.5rem"
  section: "1.4rem"
  bloc: "2.2rem"
  page-max: "1200px"
  marge-page: "clamp(1rem, 3vw, 2rem)"
  espacement-lettres: "0.12em"
  espacement-mots: "0.16em"
components:
  en-tete:
    backgroundColor: "{colors.nuit}"
    textColor: "{colors.sur-nuit}"
    typography: "{typography.marque}"
    padding: "0.65rem clamp(1rem, 3vw, 2rem)"
  bouton-plein:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.sur-accent}"
    rounded: "{rounded.champ}"
    padding: "0.5rem 0.8rem"
  bouton-plein-survol:
    backgroundColor: "color-mix(in srgb, var(--accent) 88%, var(--texte))"
  bouton-secondaire:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.champ}"
    padding: "0.5rem 0.8rem"
  bouton-secondaire-nuit:
    backgroundColor: "transparent"
    textColor: "{colors.sur-nuit}"
    rounded: "{rounded.champ}"
    padding: "0.5rem 0.8rem"
  bouton-nouvelle:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.bouton}"
    padding: "0.7rem 1.1rem"
  bouton-ligne:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.bouton}"
    padding: "0.55rem 1.15rem"
    height: "2.75rem"
  bouton-ligne-plein:
    backgroundColor: "color-mix(in srgb, var(--ligne) 82%, var(--encre-noire))"
    textColor: "{colors.sur-accent}"
    rounded: "{rounded.bouton}"
    padding: "0.55rem 1.15rem"
    height: "2.75rem"
  bouton-ligne-plein-sombre:
    backgroundColor: "var(--ligne)"
    textColor: "{colors.sur-accent-sombre}"
  compteur-etoiles:
    backgroundColor: "color-mix(in srgb, var(--sur-nuit) 12%, transparent)"
    textColor: "{colors.sur-nuit}"
    rounded: "{rounded.pilule}"
    padding: "0.3rem 0.9rem"
    height: "2.75rem"
  carte-ligne:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.carte-ligne}"
    padding: "{spacing.carte-ligne}"
  carte-collection:
    backgroundColor: "{colors.nuit}"
    textColor: "{colors.sur-nuit}"
    rounded: "{rounded.carte-ligne}"
    padding: "0.7rem"
  bandeau-jour:
    backgroundColor: "{colors.carte}"
    rounded: "{rounded.carte-ligne}"
    padding: "1rem 1.25rem 1.1rem"
  tampon:
    rounded: "{rounded.rond}"
    size: "2.35rem"
  tampon-plein:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.sur-accent}"
    rounded: "{rounded.rond}"
    size: "2.35rem"
  tampon-pale:
    backgroundColor: "color-mix(in srgb, var(--accent) 22%, var(--carte))"
    textColor: "{colors.texte}"
    rounded: "{rounded.rond}"
    size: "2.35rem"
  station:
    rounded: "{rounded.rond}"
    size: "1.5rem"
  station-pas-encore:
    backgroundColor: "{colors.carte}"
    rounded: "{rounded.rond}"
    size: "1.15rem"
  station-retenue:
    backgroundColor: "{colors.retenu}"
    rounded: "{rounded.rond}"
    size: "1.5rem"
  terminus:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.doux}"
    typography: "{typography.label-signaletique}"
    rounded: "{rounded.terminus}"
    padding: "0.42rem 0.6rem 0.32rem"
  terminus-allume:
    backgroundColor: "{colors.retenu}"
    textColor: "{colors.sur-retenu}"
    typography: "{typography.label-signaletique}"
    rounded: "{rounded.terminus}"
    padding: "0.42rem 0.6rem 0.32rem"
  niveau:
    backgroundColor: "color-mix(in srgb, var(--ligne) 82%, var(--encre-noire))"
    textColor: "{colors.sur-accent}"
    typography: "{typography.label-niveau}"
    rounded: "{rounded.niveau}"
    padding: "0.36rem 0.5rem 0.26rem"
  pastille-acquis:
    backgroundColor: "{colors.retenu}"
    textColor: "{colors.sur-retenu}"
    rounded: "{rounded.pilule}"
    padding: "0.1rem 0.6rem"
  pastille-compte:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.sur-accent}"
    rounded: "{rounded.pilule}"
    padding: "0.1rem 0.5rem"
  pastille-nouveau:
    backgroundColor: "{colors.nouveau}"
    textColor: "{colors.sur-nouveau}"
    rounded: "{rounded.pilule}"
    padding: "0 0.45rem"
  champ:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.champ}"
    padding: "0.5rem 0.8rem"
---

# Design System: Cartable

## Overview

**Creative North Star: "Le plan du réseau"**

Cartable se lit comme le plan d'un réseau de transport en commun (la STIB bruxelloise en est la référence) : chaque Leçon est une ligne épaisse à la couleur de sa Catégorie, ses Objectifs en sont les stations, et la ligne mène à un terminus « Acquis » posé en cartouche de signalétique. L'Élève voit d'un coup d'œil jusqu'où il est allé et ce qui tient en mémoire, sans pourcentage ni décompte. Au-dessus du réseau, un bandeau du jour dit où l'Élève en est aujourd'hui : l'Objectif du jour, la série et ce qui vient d'être gagné ; les jours d'avant, en tampons comme sur la page de la semaine du journal de classe belge, sont dans le calendrier de Mes badges.

Le monde est sobre et lisible : un en-tête bleu nuit, un fond gris froid, des cartes blanches posées à peine au-dessus du fond, une typographie de signalétique (Overpass) pour les titres et les noms de ligne, une police conçue pour la lisibilité (Atkinson Hyperlegible Next) pour tout le texte. La couleur est réservée au sens : la couleur de ligne dit la Catégorie, l'indigo de l'accent dit l'action et aujourd'hui, le vert dit ce qui est Retenu, le jaune dit ce qui est nouveau. Il convient autant à un enfant de 8 ans qu'à un adulte : rien n'y est infantilisant, rien n'y est compétitif.

Le monde refuse la grille de cartes boutons toutes pareilles remplies de listes de texte. Il existe en clair et en sombre (fond `fond-sombre`, cartes `carte-sombre`), choisi par le bouton de thème de l'en-tête : automatique (la préférence de l'appareil, par défaut), clair ou sombre. Le choix vaut pour l'appareil, pas pour un Élève : retenu dans le stockage de l'appareil, il s'applique dès le choix de l'Élève, avant le premier rendu, et jusque dans les Pages de leçon en iframe. L'en-tête reste bleu nuit dans les deux.

**Frontière d'extension.** À ce jour, seuls l'écran d'accueil de l'Élève (bandeau du jour, « Mes leçons », cartes de ligne), la Séance (en-tête sur la ligne de la Leçon, bulle du prof, Retour de quiz, Rebond), Nouvelle leçon (Propositions et Cadrage), Mes badges et son calendrier, et les éléments communs (en-tête, compteur d'Étoiles, boutons, champs, jetons de couleur et polices) portent ce monde. Les autres écrans (choix de l'Élève, Révisions du jour, Vue parent, Profil) héritent des jetons et des polices mais n'ont pas été redessinés : ils gardent des valeurs antérieures (verts et ors codés en dur, ombres noires en `rgba`). Ces valeurs ne font pas partie du système ; la prochaine refonte d'un écran doit les ramener aux jetons et à la grammaire du réseau.

**Key Characteristics:**
- Une Leçon = une ligne de couleur de Catégorie, des stations, un terminus « Acquis ».
- Quatre états de station lisibles sans légende : vide, hachurée, blanche, verte.
- Bandeau du jour sobre : salut, série, Objectif du jour et ses gains, discret à côté des Leçons.
- Bleu nuit pour la marque, indigo d'encre pour l'action, vert pour ce qui tient ; un seul bouton plein par écran.
- Overpass 800 en signalétique, Atkinson Hyperlegible Next pour lire, chiffres tabulaires.
- Plat par défaut, ombres douces teintées de nuit, aucun relief dur.

## Colors

Une palette froide et neutre où chaque teinte saturée porte un seul sens.

### Primary
- **Indigo de l'accent** (`accent`, `accent-sombre` en sombre) : l'action et le présent. Boutons pleins hors de l'accueil, contour et pastille de compte des Révisions du jour quand des Questions sont dues, texte de « Apprendre quelque chose de nouveau », tampon du jour plein ou pâle, cadre du jour courant, liens, anneau de focus (3px), sélection de texte (30 %). C'est un indigo d'encre, plus foncé que toutes les couleurs de ligne en clair (`#262a7a`) et plus clair qu'elles en sombre (`#b9c3ff`) : il se sépare d'elles par la clarté, la seule distance possible puisque les lignes occupent déjà tout le cercle des teintes. Avec le bleu des Maths, l'écart OKLab passe de 4,9 à 16,8 en clair et de 1,9 à 12,4 en sombre (#141). Sur la nuit de l'en-tête, où il ne se voit pas, l'anneau de focus passe en `sur-nuit`.
- **Bleu nuit de la marque** (`nuit`) : l'en-tête dans les deux thèmes. Le texte dessus est `sur-nuit`, le texte secondaire `sur-nuit-doux`.

### Secondary
- **Couleurs de ligne** (`ligne-francais`, `ligne-mathematiques`, `ligne-sciences`, `ligne-histoire`, `ligne-geographie`, `ligne-langues`, `ligne-arts`, `ligne-autre`, et leurs variantes `-sombre`) : la Catégorie d'une Leçon. Elles sont identiques à celles des Catégories du Kit (`public/kit/v1/quiz.css`), pour qu'une Leçon garde sa couleur de l'accueil à ses pages. En clair, les surfaces pleines (Continuer de la Leçon en tête, cartouche de Niveau) utilisent la ligne foncée (`color-mix(in srgb, var(--ligne) 82%, var(--encre-noire))`) avec du texte `sur-accent` (blanc) ; en sombre, la ligne elle-même avec du texte `sur-accent-sombre`.

### Tertiary
- **Vert Retenu** (`retenu`) : ce qui tient en mémoire. Station Retenue, terminus allumé, pastille « Acquis ✓ ».
- **Jaune Nouveau** (`nouveau`) : la seule couleur de ce qui est nouveau, distincte de toutes les couleurs de ligne, texte `sur-nouveau` bleu nuit : la pastille « Nouveau » (dans le compteur d'Étoiles et ailleurs).
- **Mots de Maîtrise** (`rouge`, `orange`, `vert`) : la couleur du texte des paliers « à revoir », « à consolider », « bien en tête », et de « Objectif du jour atteint ». Texte seulement, jamais en aplat.
- **Paliers des Badges** (`palier-bronze`, `palier-argent`, `palier-or`, `palier-diamant`, `palier-unique`, et leurs variantes `-sombre`) : l'anneau de la pastille d'un Badge, sur un fond pâle de la même teinte (`color-mix(in srgb, var(--palier) 18%, var(--carte))`). Les valeurs claires sont foncées et les sombres éclaircies pour que l'anneau tienne 3:1 contre la carte et contre son fond. Jamais en aplat plein, jamais hors d'un Badge : la pastille, et sur la ligne d'un Badge l'anneau de ses stations atteintes.

### Neutral
- **Gris froid du fond** (`fond`) : le fond de page, sur lequel les cartes se détachent.
- **Blanc des cartes** (`carte`) : cartes de ligne, bandeau du jour, boutons secondaires, champs.
- **Encre nuit** (`texte`) : le texte, et l'anneau des stations atteintes en clair.
- **Gris doux** (`doux`) : texte secondaire, libellés (« Prochaine station : »), noms de jours, terminus éteint.
- **Filet** (`bord`) : bordures des cartes et des champs, séparateur pointillé des Objectifs.
- **Blanc de station** (`station-atteinte`) : le cœur blanc des stations atteintes, et leur anneau en sombre ; blanc dans les deux thèmes.
- **Hachure** (`hachure`, `hachure-sombre`) : le fond clair entre les hachures des stations « à confirmer ».
- **Encre noire** (`encre-noire`) : ne sert qu'à foncer une couleur de ligne (`color-mix`), jamais en aplat.
- **Voie vide** (`troncon`) : les tronçons de ligne pas encore parcourus.
- **Voile** (`voile`, `voile-sombre`) : le voile translucide posé sur la Page de leçon derrière une question du prof ou une attente, en Séance, et sous la boîte de dialogue modale du Cadrage ; nuit à 50 % en clair, noir à 65 % en sombre.
- **Station vide** (`station-vide`) : l'anneau des stations pas encore évaluées, les hachures « à confirmer », le contour des tampons vides et du terminus éteint.

### Named Rules
**La règle de la couleur de ligne.** La couleur d'une Catégorie n'appartient qu'à ses Leçons : le trait parcouru, la puce de la Catégorie, le cartouche de Niveau, le bouton Continuer (plein ou son contour) et l'anneau « vous êtes ici » (station ou carte de la Leçon en tête). Elle ne sert jamais à autre chose, et ses valeurs se changent dans une nouvelle version du Kit, jamais ici seul.

**La règle du vert qui tient.** Un aplat vert signifie Retenu ou Acquis, rien d'autre. Le vert des mots de Maîtrise reste du texte.

**La règle de la seule couleur du nouveau.** Ce qui est nouveau porte le jaune `nouveau`, et rien d'autre ne le porte en pastille.

## Typography

**Display Font:** Overpass (avec Atkinson Hyperlegible Next, system-ui)
**Body Font:** Atkinson Hyperlegible Next (avec system-ui, sans-serif)

**Character:** Overpass, dessinée d'après la signalétique routière, donne aux titres et aux cartouches la voix d'un panneau de station ; Atkinson Hyperlegible Next, dessinée pour les lecteurs malvoyants, porte tout ce qui se lit, y compris pour un Élève dyslexique. Les deux sont servies par l'appli (`public/polices/`, licence SIL OFL), en sous-ensembles latin et latin étendu, `font-display: swap`.

### Hierarchy
- **Display** (Overpass 800, 2rem, 1.1 ; `display-mobile` 1.6rem sous 640px) : le titre « Mes leçons » et celui de la Vue parent.
- **Headline** (Overpass 800, 1.45rem, 1.1) : le salut du bandeau du jour ; les autres titres de section (`h2`) prennent la même voix Overpass 800 ; sur la Vue parent, ses sections (`h3`).
- **Title** (Overpass 800, 1.3rem, 1.2 ; `title-mobile` 1.15rem sous 640px) : le nom d'une Leçon sur sa carte de ligne, équilibré (`text-wrap: balance`). Les noms de Catégorie sont à 1.2rem, précédés de leur puce de couleur.
- **Marque** (Overpass 800, 1.35rem, 1) : « 🎒 Cartable » dans l'en-tête.
- **Body** (Atkinson 400, 17px, 1.5) : tout le texte courant ; les détails (prochaine station, Objectifs) passent à 1.3–1.35 d'interligne.
- **Petit texte d'action** (Atkinson 700, 0.92rem) : « Voir les Objectifs », contrôle à venir, « Terminée », et tout texte secondaire (maîtrise, compteurs, détails d'Objectif, étape du Cadrage).
- **Label signalétique** (Overpass 800, 0.74rem, 0.07em, capitales) : le terminus « ACQUIS » et les noms de jours du calendrier de Mes badges. Le cartouche de Niveau est à 0.78rem, 0.04em.

**La règle de l'échelle.** Toute taille de texte de `public/style.css` est un niveau ci-dessus ; `test/style.test.js` échoue sur toute autre. Seules exceptions : les tailles en `em` de la pastille d'un Badge, relatives au texte qui la porte. Sur la Vue parent, chaque niveau voisin vaut au moins 1,25 fois le précédent : corps 17px, section 1.45rem (×1,36), titre 2rem (×1,38).

### Named Rules
**La règle de la signalétique.** Les capitales espacées sont réservées aux cartouches de signalétique du réseau (terminus, Niveau, noms de jours) ; aucun texte courant, aucun titre n'est en capitales.

**La règle de l'espacement des lettres.** Un réglage du Profil, coupé par défaut, agrandit l'espacement des lettres (`--espacement-lettres`, 0.12em) et des mots (`--espacement-mots`, 0.16em), les valeurs que WCAG 1.4.12 demande de supporter. Il s'applique à l'appli, aux Pages de leçon, au quiz et aux Révisions du jour ; les schémas SVG n'y sont pas soumis. Le texte doit rester lisible sans perte avec ce réglage : pas de hauteur fixe sur un bloc de texte.

**La règle des chiffres alignés.** Les compteurs (Étoiles, Fusées, dates des tampons, total de l'en-tête) sont en chiffres tabulaires.

## Layout

Une colonne centrée de 1200px au plus, avec une marge latérale fluide (`clamp(1rem, 3vw, 2rem)`), partagée par l'en-tête et le contenu. L'accueil se lit de haut en bas : le bandeau du jour, puis l'en-tête « Mes leçons » avec le bouton « Apprendre quelque chose de nouveau » aligné à droite, puis « Tu en étais là » : la Leçon à la dernière activité la plus récente, seule et sur toute la largeur, sa carte cerclée « vous êtes ici » et son Continuer plein. Viennent ensuite une section par Catégorie, sans cette Leçon (une Catégorie qui n'avait qu'elle disparaît).

Le bandeau du jour est une grille de deux colonnes : à gauche, le salut et le lien « Mon calendrier et mes badges » sur une ligne, puis la série ; à droite, une colonne de 16 à 20rem pour l'Objectif du jour (avec les gains d'aujourd'hui et le moment de révision) et les Révisions du jour. Les deux colonnes sont centrées l'une sur l'autre ; le bandeau tient en une hauteur de salut, de deux ou trois lignes de série et de l'Objectif du jour. Sous 860px (tablette), il se resserre pour que « Mes leçons » remonte : la colonne de droite passe dessous et l'Objectif du jour et les Révisions s'y mettent côte à côte, les marges se réduisent. Sous 520px, il se resserre encore (lien du calendrier masqué, Objectif et Révisions de nouveau l'un sous l'autre).

Les cartes de ligne d'une Catégorie forment une grille fluide (`minmax(min(100%, 31rem), 1fr)`, écart 1rem) : deux colonnes sur grand écran, une sur tablette en portrait et sur téléphone. Les Catégories elles-mêmes se posent sur la même grille (`.reseau`) : une Catégorie à une seule Leçon prend une colonne, si bien que deux Catégories à une Leçon qui se suivent partagent un rang au lieu de laisser chacune une demi-rangée vide ; une Catégorie à plusieurs Leçons prend toute la largeur. L'ordre des Catégories reste celui de la configuration. Les titres de Leçon et la prochaine station gardent les espaces insécables du français (guillemets, « : ; ? ! »), pour qu'aucun signe ne reste seul en début de ligne. Toutes les cartes ont la même anatomie : tête (Niveau, nom, mot de Maîtrise), ligne, pied (prochaine station, contrôle, récompenses, Continuer), puis le dépliant des Objectifs.

Le rythme vertical : 2.2rem avant « Mes leçons », 2.2rem sous la Leçon en tête, 1.4rem entre Catégories, 1rem entre cartes, 0.85rem entre les rangs d'une carte. L'en-tête masque l'âge sous 900px, le pseudo sous 640px et le nom « Cartable » sous 480px, en gardant toujours le compteur d'Étoiles, Profil, Changer et le bouton de thème.

## Elevation & Depth

Le système est plat, avec un soupçon de pose : les cartes de ligne et le bandeau du jour reposent sur le fond gris froid grâce à leur bordure `bord` et à une ombre ambiante très diffuse teintée de bleu nuit (`--ombre: 20 24 43`, noir en sombre). Il n'y a que deux poses, déclarées en variables sur le `:root` de `public/style.css` : `--ombre-carte` et `--ombre-bandeau`. Hors des cartes de ligne et du bandeau, seuls quatre éléments en portent une : les cartes de Séance posées sur la Page de leçon, la boîte de dialogue du Cadrage et la carte d'attente de Nouvelle leçon prennent la pose de carte de ligne, le calendrier de Mes badges la pose du bandeau. Les cartes simples n'en ont pas. La profondeur sur la ligne est faite de halos : le terminus et la station « vous êtes ici » sont détourés d'un anneau à la couleur de la carte, qui les découpe du trait.

### Shadow Vocabulary
- **Pose de carte de ligne** (`--ombre-carte` : `0 1px 2px rgb(var(--ombre) / .06), 0 6px 18px rgb(var(--ombre) / .05)`) : les cartes de Leçon, en Séance les cartes posées sur la Page de leçon (bulle du prof, Retour de quiz, Leçon terminée), le Cadrage et la carte d'attente de Nouvelle leçon.
- **Pose du bandeau** (`--ombre-bandeau` : `0 2px 10px rgb(var(--ombre) / .05)`) : le bandeau du jour et le calendrier de Mes badges.
- **Vous êtes ici** (`box-shadow: 0 0 0 .2rem var(--carte), 0 0 0 .42rem var(--ligne)`) : la prochaine station. La carte de la Leçon en tête prend un anneau simple de 2px `ligne` (`0 0 0 2px var(--ligne)`), en plus de sa pose, et son titre au corps des autres cartes : elle ne pèse pas plus que l'Objectif du jour (#166).
- **Découpe du terminus** (`box-shadow: 0 0 0 .2rem var(--carte)`) : sépare le cartouche du trait.
- **Jour courant** (`box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent)`) : le cadre d'aujourd'hui dans le calendrier de Mes badges.

### Named Rules
**La règle de la pose légère.** Les ombres sont ambiantes et teintées de nuit, jamais décalées ni dures ; un élément ne monte pas au survol, il change de teinte.

## Shapes

Des cartes aux coins francs mais doux (18px pour les cartes de ligne et le bandeau, 14px pour les cartes simples), des boutons à 12px (10px pour les boutons et champs de base), des cartouches de signalétique plus carrés (terminus 8px, Niveau 7px, puce de Catégorie 6px). Les pilules (999px) sont réservées aux compteurs et pastilles (Étoiles de l'en-tête, « Nouveau », « Acquis ✓ »). Les stations et les tampons sont des cercles.

Le trait de ligne est une barre de 0.55rem d'épaisseur, coupée en tronçons entre les stations. Une Leçon sans Objectifs montre une ligne « en travaux » : un trait en tirets à la couleur de ligne, à 55 % d'opacité. Le pointillé est un matériau natif du monde : tampons vides en tirets, jours futurs en points, séparateur des Objectifs en tirets.

## Components

### Buttons
Francs et pleins, toujours à au moins 2.75rem (44 px) de haut pour le doigt.
- **Shape:** coins doux (10px de base ; 12px pour les boutons d'accueil et Continuer).
- **Bouton plein :** fond `accent`, texte `sur-accent`, graisse 700. Au survol, l'accent se mélange de 12 % d'encre ; transition de fond 0.15s. Dans le Kit, **Valider** est ce bouton plein, au fond `--kit-accent-fort` (l'accent des aplats sous texte blanc : la ligne foncée en clair, la ligne elle-même en sombre) ; « Je ne sais pas » reste secondaire (filet). Valider n'est visible que le temps d'une question, jamais avec un autre bouton plein.
- **Bouton secondaire :** fond `carte`, filet `bord`, texte `texte`, graisse 600 ; au survol, 6 % d'encre. Dans l'en-tête, il devient transparent avec un filet `sur-nuit` à 32 % et un survol `sur-nuit` à 10 %.
- **Continuer (bouton de ligne) :** contour de 2px de la ligne foncée (la ligne en sombre) sur la `carte`, texte `texte`, graisse 800, 2.75rem de haut ; au survol, un fond de ligne à 12 % ; à l'appui, descend d'1px. **Sur la Leçon en tête seulement**, il est plein : fond de la ligne foncée, texte `sur-accent` (en sombre, la ligne elle-même et `sur-accent-sombre`), au survol `brightness(1.1)`. C'est le seul bouton plein de l'accueil.
- **Thème (en-tête) :** bouton secondaire de l'en-tête réduit à son icône (🌗 automatique, ☀️ clair, 🌙 sombre) ; un clic passe d'automatique à clair, à sombre, puis revient à automatique. Son nom accessible (et son infobulle) dit le thème courant et l'action : « Thème : clair. Passer au thème sombre ».
- **Apprendre quelque chose de nouveau :** une action en retrait, pas un bouton principal : texte `accent` en graisse 700, sans fond ni filet, 12px, avec un fond `accent` à 8 % au survol ; sous 520px, son texte s'aligne sur le bord du contenu. Quand le réseau est vide, c'est la seule chose à faire : il devient le bouton plein de l'écran.
- **Révisions du jour :** bouton à deux lignes (titre fort, détail en petit) : contour de 2px `accent` sur la `carte`, texte `texte`, avec la pastille de compte au bout du titre, quand des Questions sont dues ; secondaire sinon (« Rien à revoir aujourd'hui »). Jamais plein.
- **Rebond (Séance) :** la suite recommandée après un quiz est un bouton plein à deux lignes (action en 800, score du quiz en petit), 12px, 2.75rem de haut ; les autres Rebonds sont des boutons secondaires. Aucun bouton ne pulse.
- **Focus :** anneau de 3px `accent`, décalé de 2px, sur tout élément ; `sur-nuit` dans l'en-tête.
- **Désactivé :** opacité 0.5.

### Chips
- **Compteur d'Étoiles :** pilule `sur-nuit` à 12 % sur la nuit (20 % au survol), ⭐ et total en chiffres tabulaires 800 ; ouvre Mes badges.
- **Nouveau :** pilule `nouveau`, 0.75rem, graisse 700.
- **Compte :** pilule `accent`, texte `sur-accent`, 0.85rem, chiffres tabulaires : le nombre de Questions dues au bout du titre des Révisions du jour (le mot « questions » est lu, pas affiché).
- **Acquis ✓ :** pilule `retenu` sur le mot de Maîtrise, là où aucune ligne ne l'accompagne. Sur une carte de ligne comme dans l'en-tête de la Séance, une Leçon acquise ne le dit qu'une fois : par le terminus allumé, qui porte la Maîtrise en infobulle.
- **Niveau :** cartouche de ligne foncée, capitales Overpass.

### Attente de chargement et bloc d'erreur
- **Indicateur d'attente (`attente-chargement`) :** une carte simple de 24rem au plus, jamais rouge, posée à la place de l'écran quand le chargement dépasse 400 ms (jamais sur une réponse rapide, pour éviter le clignotement). Elle dessine la ligne « en travaux » avec `ligneLecon` à la couleur `ligne-autre`, ses pointillés avançant (coupés sous `prefers-reduced-motion`), et la phrase « Chargement en cours… » en `doux`. La zone d'état `#etat` (`role="status"`, masquée à l'œil) l'annonce sans prendre le focus ; `main` porte `aria-busy` pendant le chargement.
- **Bloc d'erreur (`bloc-erreur`) :** à la place d'un bloc en échec ou de l'écran entier, une phrase en `rouge` annoncée comme alerte (`role="alert"`) et un bouton secondaire « Réessayer » de 2.75rem de haut. Sans Profil lisible (500, réseau), l'Élève choisi est gardé : « Qui es-tu ? » n'apparaît que pour un Profil introuvable.

### Cards / Containers
- **Corner Style:** 18px (carte de ligne, bandeau), 14px (carte simple).
- **Background:** `carte` sur `fond`.
- **Shadow Strategy:** pose légère (voir Elevation & Depth) pour la carte de ligne, le bandeau, les cartes de Séance, le Cadrage et le calendrier ; les cartes simples n'ont que leur filet.
- **Border:** 1px `bord`.
- **Internal Padding:** 1.05rem 1.25rem 0.5rem pour la carte de ligne (0.95rem 1rem 0.4rem sous 640px), 1rem pour la carte simple.

### Inputs / Fields
- **Style:** fond `carte`, filet 1px `bord`, coins 10px, padding 0.5rem 0.8rem, police héritée. Les contrôles natifs suivent le thème (`color-scheme: light dark` en automatique, `light` ou `dark` quand il est choisi).
- **Focus:** l'anneau de focus commun (3px `accent`).

### Navigation
- **En-tête :** bande bleu nuit pleine largeur, « 🎒 Cartable » à gauche, puis à droite le compteur d'Étoiles, le pseudo et le niveau en `sur-nuit-doux`, les boutons secondaires Mon profil et Changer, puis le bouton de thème, à tous les écrans (choix de l'Élève compris). En sombre, un filet `bord` le sépare du contenu.

### La ligne et ses stations
La signature du système. Le trait est à la couleur de la Catégorie jusqu'à la dernière station atteinte, en `troncon` ensuite ; le dernier tronçon jusqu'au terminus ne se colore que quand la Leçon est Acquise.
- **Pas encore évaluée :** petit cercle vide (1.15rem), fond `carte`, anneau fin `station-vide`.
- **À confirmer :** cercle hachuré à 45° de `station-vide` sur `hachure`, anneau fin `station-vide`.
- **Atteinte :** cercle `station-atteinte` (1.5rem) à anneau épais d'encre `texte` (`station-atteinte` en sombre).
- **Retenue :** cercle plein `retenu`.
- **Vous êtes ici :** la prochaine station est entourée d'un anneau à la couleur de ligne, détouré de la carte.
- **Terminus :** cartouche « ACQUIS » en label signalétique, filet `station-vide`, texte `doux` ; allumé, il devient un aplat `retenu` « ACQUIS ✓ ».
- La ligne entière porte un texte alternatif (« 3 sur 5 Objectifs atteints, 1 Retenu… »). Le dépliant « Voir les Objectifs » reprend chaque station en légende de sa ligne de texte, avec son état en mots ; il s'ouvre en hauteur (0.22s, ease-out), chevron tournant.

### La Séance
La Page de leçon remplit l'écran sous un en-tête de Séance qui situe l'Élève sur son réseau.
- **En-tête :** « ← Mes leçons », le cartouche de Niveau et le nom de la Leçon (Title), le mot de Maîtrise (rien quand la Leçon est acquise : le terminus allumé le dit), puis la ligne de la Leçon (`ligneLecon`, prochaine station en « vous êtes ici ») et « Ma fiche ». Sous 640px, la ligne passe sur sa propre rangée.
- **Bulle du prof :** carte 18px à pose légère, au centre, sur le `voile` quand une page est dessous ; Réponses proposées en boutons pleins de 12px.
- **Prédiction (Page de leçon, Kit) :** carte 14px comme les questions du quiz, filet d'accent de 1px tout autour (jamais un filet épais d'un seul côté) et teinte `accent-doux`, posée avant une partie de la page. Ses réponses sont des boutons de 2.75rem de haut au contour neutre ; la réponse choisie prend le contour `texte` des réponses du quiz avant correction. Jamais de vert ni de rouge : elle est hors score, il n'y a pas de faute à craindre. La révélation s'ouvre dans la carte, sous un filet pointillé d'accent, sans rien déplacer au-dessus.
- **Retour de quiz :** carte 18px à pose légère en bas à droite, bouton ✕ secondaire de 2.75rem, au-dessus du Rebond.
- **Leçon terminée :** carte 18px à pose légère, « 🏆 Leçon terminée » en Title Overpass, score du Défi et récompenses dessous.

### Le bandeau du jour
Une carte blanche de deux colonnes. À gauche : le salut en Headline, le lien « Mon calendrier et mes badges » à sa droite, puis la série. À droite : l'Objectif du jour, ses gains d'aujourd'hui et le moment de révision, puis les Révisions du jour. Plus de rangée de jours : le calendrier de Mes badges les porte.
- **Série de jours (#166) :** paragraphes en corps normal et en `texte`, sans reproche : la série et les jokers, le message du joker qui a protégé la série. La réparation proposée le jour du retour (🩹, avancement « 4/10 révisions ou 0/2 pages ») ; après une série repartie, « Ta meilleure série » et les jours travaillés en tout.
- **Gains d'aujourd'hui (#192) :** sous l'Objectif du jour, ⭐ et 🚀 (le nombre quand il dépasse 1) puis les pastilles des Paliers de Badge gagnés aujourd'hui, en 0.92rem, qui reviennent à la ligne ; nommés pour les lecteurs d'écran (« 2 Étoiles »). Sans gain, rien : ni zone vide ni « 0 ». Les gains des autres jours sont dans le calendrier de Mes badges ; les contrôles à venir, sur les cartes de Leçon.
- **Moment de révision :** sous l'Objectif du jour, une question fermée en boutons secondaires (le choix en cours cerclé de 2px `accent`), proposée une fois par jour ; ensuite une ligne `doux` « Je reviens : … » et un lien « Changer » en texte `accent`, sans fond.

### Le tampon de jour
Un tampon rond par jour, avec le nom du jour en label signalétique au-dessus ; il n'est plus que dans le calendrier de Mes badges (`tamponJour` dans `public/app.js`).
- **Vide :** contour en tirets `station-vide`, date en `doux` ; **futur :** contour en points, date atténuée.
- **Pâle (travaillé) :** aplat d'accent à 22 % sur la carte.
- **Plein (Objectif du jour atteint) :** aplat `accent`, date `sur-accent`.
- **Joker :** 🛡️ en exposant sur le tampon.
- **Jour réparé :** 🩹 en exposant sur le tampon, à la place de 🛡️ (une Série de jours réparée, pas un Joker).
- **Aujourd'hui :** la case du jour est teintée d'accent à 9 % et cerclée d'accent à 45 %, son nom passe en `accent`.

### Mes badges
L'en-tête de page (« Mes badges » en display, le total d'Étoiles et de Fusées à droite en chiffres tabulaires), puis deux colonnes (une seule sous 900px) : le calendrier à gauche, la collection à droite.
- **Calendrier :** une carte comme le bandeau du jour (18px, pose du bandeau), le mois en titre entre deux boutons secondaires ‹ ›, les noms de jours en label signalétique, puis un tampon de jour par date, le tampon de jour (`tamponJour` dans `public/app.js`) : vide, futur, pâle, plein, 🛡️ Joker, 🩹 jour réparé, aujourd'hui. Les jours d'avant le premier jour de l'Élève sont neutres (« avant » : date atténuée, sans contour), pour ne pas se lire comme des jours manqués, et ne se touchent pas plus que les jours futurs. Sous la grille, une légende d'une ligne en `doux` reprend quatre petits tampons muets : travaillé, Objectif du jour atteint, joker, jour réparé. Chaque jour est un bouton ; le jour touché est entouré d'un anneau `texte` détouré de la carte, comme « vous êtes ici » (aujourd'hui choisi garde sa teinte mais perd son cadre, pour ne pas se souligner deux fois), et son détail (Leçons en liste quand il y en a plusieurs, quiz, Révisions du jour, gains en pastilles qui reviennent à la ligne) s'affiche sous un filet pointillé. Aujourd'hui est montré à l'ouverture. Au clavier, la grille (nommée par son mois, titre de section) ne compte qu'un arrêt de tabulation, et les flèches passent d'un jour à l'autre, d'un mois à l'autre ; les jours font au moins 2.75rem de haut. Les dates n'écrivent l'année que quand ce n'est pas celle d'aujourd'hui.
- **Mot d'accueil :** à la première ouverture, une phrase en gras sous le titre ; c'est l'appli qui parle, jamais la bulle du prof.
- **Collection :** une carte simple (14px, filet), titrée « Ma collection » en Headline (1.45rem), dont les rangées sont séparées par des tirets. Chaque Badge commencé (au moins un Palier) est une **ligne de Badge** (`ligneBadge` dans `public/app.js`), le dernier Palier gagné en premier : la pastille du Badge et son nom (Overpass 800, 1.2rem), la phrase qui dit ce qu'il salue en `doux`, puis la ligne. Viennent ensuite, sous des titres de groupe en `doux` (Overpass 800, 1.2rem), « Surprises trouvées » (pastille `palier-unique`, nom, date) et « À découvrir » : les Badges sans Palier, pastille grisée, nom en `doux` et phrase, sans ligne ni décompte. Les surprises non trouvées restent cachées.
- **Ligne de Badge :** la grammaire de la ligne, avec ses Paliers (bronze, argent, or, diamant ; trois pour certaines familles) pour stations, également espacées. Une station atteinte est la station blanche cerclée de la couleur de son Palier ; le prochain Palier est une station vide entourée du halo « vous êtes ici » en `doux` : la couleur d'un Palier ne se montre qu'une fois gagné. Le trait est en `doux` (aucune couleur de Catégorie) jusqu'au dernier Palier obtenu ; le tronçon vers le prochain se remplit en partie, selon le chemin fait d'après le meilleur compte atteint, qui ne recule jamais. Aucun chiffre ni pourcentage n'est affiché : c'est la seule jauge du système. Sous chaque station, son Palier (0.92rem, gras et `texte` une fois atteint), sa date courte et, s'il vient d'être gagné, la pastille « Nouveau ». La ligne entière porte un texte alternatif en mots (« Mémoire : bronze le 2 octobre 2026, argent le 6 octobre 2026 ; à mi-chemin du Palier or »).

### La carte de ligne (Mon réseau)
Une Leçon Acquise gardée pour toujours, dessinée par `carteLigne` (`public/app.js`) ; son texte, ses stations et sa scène de repli viennent de `public/carte-ligne-texte.js`. C'est le seul composant « carte » de Mon réseau.
- **Forme :** 5 sur 7, coins de 18px, cadre de 0.3rem à la couleur de la Catégorie (`ligne-…`), pose d'une carte (`ombre` à 25 %). Grille de 8.5rem à 12.5rem de large, deux cartes de front à 390px.
- **Calques :** trois, en parallaxe à l'inclinaison au pointeur ou au toucher : `l1` (fond, 4px), `l2` (décor, 7px), le héros (14px, qui peut déborder sur la ligne et le cadre sans être rogné). Un reflet doux (`sur-nuit`) suit le pointeur. Sous `prefers-reduced-motion`, ni inclinaison ni boucle : la carte reste entière.
- **La ligne** traverse la carte à l'avant du décor : c'est `ligneLecon`, une station Retenue par Objectif (taille réduite pour que n stations tiennent), cernée d'un filet `sur-nuit` pour se lire sur le ciel. Le terminus « Acquis ✓ » en est détaché et posé au-dessus du héros, sur un détourage `nuit`.
- **Texte :** titre en haut (Overpass 800, 0.92rem) et Catégorie en bas (0.78rem), en `sur-nuit` sur un voile d'ombre qui garde le texte lisible quel que soit le héros. Aucun décompte, aucune jauge.
- **Dos :** cartouche de la Catégorie (`ligne`, texte `sur-accent`), nom, la phrase de ce que la carte salue, la date, sur `carte` ; toucher ou Entrée retourne la carte.
- **Boucles du décor :** les classes d'animation `pc-a-*` de la Trousse ne tournent que pendant 6 secondes après le survol, le focus ou le retournement.
- **Scène générique :** quand l'agent n'a rien composé, l'appli dessine un ciel de la Catégorie, deux collines et une étoile à pointes (une de plus que d'Objectifs, de 5 à 9), toujours la même pour la même Leçon.

### La carte de Badge (Mes Badges)
Un Badge gagné, dessiné à la main par `carteBadge` (`public/app.js`) ; son texte, ses crans et le Palier montré viennent de `public/carte-badge-texte.js`, ses trois calques de `public/carte-badge-art.js` (une carte par Famille, une pour les surprises). C'est la carte de ligne, avec ces écarts :
- **Cadre :** la couleur du Palier atteint (`palier-bronze`, `palier-argent`, `palier-or`, `palier-diamant`) ; une surprise est `palier-unique`, violette. La grille montre le Palier le plus haut, jamais une carte par Palier.
- **Dessin :** trois calques et un héros, par Famille ; le Palier l'enrichit (stations allumées, étoiles, halos). Couleurs par `var(--jeton)` seulement, aucun texte de police dans le dessin ; l'emoji de la surprise est son héros.
- **Crans :** en bas de la face, une pastille par Palier de la Famille dans un cartouche sombre, allumée (couleur du Palier) jusqu'au Palier atteint, en pointillé au-delà.
- **Feuille holographique :** or et diamant seulement. Un dégradé de jetons (`palier-diamant`, `palier-unique`, `nouveau`, `retenu`) qui suit le pointeur, lent, sans éclat ; il reste fixe sous `prefers-reduced-motion`.
- **Dos :** cartouche du Palier, nom, ce que le Badge salue, la ligne de Badge (`ligneBadge`, seule jauge, sans chiffre, ses noms de Palier dits par le texte alternatif), la date et le prochain Palier en mots.
- **À découvrir :** une carte hachurée (filet pointillé `station-vide`, rayures de `hachure`), emoji grisé, nom et phrase en `doux`, sans dessin ni décompte. Les surprises non trouvées n'ont pas de carte.

### Vue parent
Un `h2` de page, puis un **sommaire** de trois ancres (liens `accent`, graisse 700, 2.75rem de haut, sur une ligne qui passe à la suivante) et trois **blocs** : « Ce qu'il retient », « Ce qui demande de l'aide », « Réglages et coûts ». Un bloc est une carte simple (14px, filet `bord`, sans ombre) dont le titre est un `h3` en Overpass 800 (1.2rem) ; ses sections sont des `h4` en Overpass 700 (1rem), séparées par un filet pointillé `bord`. Dans le dernier bloc, chaque section est un `details` dont le `summary` porte le `h4` et le chevron du dépliant des Objectifs (il garde son état ouvert quand un geste recharge l'écran). Les liens de Leçon sont en `accent`, graisse 600, 1.5rem de haut au moins ; le sommaire n'écrit pas dans le hash (celui du routeur) et ouvre une cible repliée. Aucune couleur nouvelle.

### Nouvelles cartes et cérémonie
Les cartes à retourner attendent dans un groupe « Nouvelles cartes », au-dessus de « Mon réseau » (`nouvellesCartesGroupe`, `public/app.js` ; logique dans `public/nouvelles-cartes.js`). Une carte face cachée a la proportion de la carte (5 sur 7, coins de 18px) : rayures de `nuit` et de la couleur neutre `station-vide` (violette, `palier-unique`, pour une surprise ; `ligne-autre` pour une carte de ligne), jamais la couleur du Palier, qui ne se dit pas avant le geste ; au centre le médaillon du Badge (ou 🚉), sur un disque `nuit` cerclé de `nouveau` ; la marque « Nouveau » en haut à droite. La cérémonie est un `<dialog>` modal plein écran sur un fond `nuit` à 88 % : la carte à 62 % de la largeur (15rem au plus), puis le nom en Headline, ce que la carte salue en `sur-nuit-doux`, un seul bouton à la fois : « Plus tard » en secondaire transparent avant le retournement, puis « Fermer » plein `nouveau` (seul bouton plein de l'écran), qui range la carte d'office. L'entrée est bornée à moins de 2,5 s et jouée une fois : retournement, ciel, décor, ligne, héros qui tombe, stations allumées une à une, gerbe de pastilles `nouveau` ; l'état final est l'état naturel de la carte. Sous `prefers-reduced-motion`, tout apparaît d'emblée, sans gerbe. Une carte retournée est rangée d'office : plus d'étape « Ajouter ». Le réglage du carillon, dans le Profil, est une case à cocher comme les autres réglages.

### Emplacement de carte dans l'encart de Leçon (accueil)
L'encart d'une Leçon porte, à droite du corps (7.5rem ; à 640px et moins, 6.5rem, posé à côté de « Prochaine station » et de Continuer, le titre et la ligne gardant toute la largeur), un emplacement de carte à trois états (`emplacementCarteLecon`, `public/app.js`) : le **template « À découvrir »**, le même gabarit hachuré que les cartes « À découvrir » de Mes badges (`carte-badge-carte verrou`), statique, sans dessin ni décompte, 🚉 grisé et « À découvrir » ; le **dos « Nouveau »** (`carteFaceCachee`), qui ouvre la cérémonie sans quitter l'accueil, inerte tant que la carte n'est pas composée ; la **carte de ligne** retournable une fois retournée. Aucune couleur nouvelle.

### Propositions et Cadrage (Nouvelle leçon)
- **Proposition :** carte simple cliquable (14px, filet, pas d'ombre). Elle porte la couleur de sa Catégorie par `--ligne`, seulement sur sa puce. Son type est dit en mots dans une cartouche de signalétique (Overpass 800, 0.74rem, capitales), dont le libellé vient de `public/nouvelle-lecon-texte.js` : **Prolonge ta ligne** (une suite) en aplat de ligne foncée, comme le cartouche de Niveau, puisqu'elle prolonge une ligne déjà ouverte (jamais « Pour aller plus loin », qui est le Dépassement d'une Page de leçon) ; **Nouveau sujet** en filet `station-vide`, texte `doux`, comme le terminus éteint : il reste gris, le jaune `nouveau` étant réservé à ce qui vient d'arriver. « 🎒 Au programme » est un mot gras à côté, sans pastille. Puis le titre (Overpass 800, 1.15rem), la Catégorie en `doux` derrière sa puce, et l'accroche.
- **Accroche :** une phrase courte qui tutoie l'Élève (les consignes des Propositions le demandent), coupée à 2 lignes à l'écran. Son texte complet reste dans la carte et en est la description accessible ; le nom accessible de la carte se limite à son titre et à son type.
- **Grille des Propositions :** 4 colonnes au plus sur ordinateur (dès 1100px), 3 sur tablette (dès 768px), 2 sur grand téléphone (dès 560px), 1 en dessous. Dans cette limite, la grille prend le plus grand nombre de colonnes qui ne laisse aucune carte seule sur sa dernière rangée (5 cartes en 3 + 2, 4 cartes en 2 + 2 sur tablette). Le nombre de Propositions reste le réglage du Profil (2 à 10, 4 par défaut).
- **Cadre :** « ← Mes leçons » comme en Séance, puis le titre d'écran « Une nouvelle ligne » en Display ; le titre du document suit.
- **Les deux autres voies** (« 📄 Réviser une leçon de classe », « 💡 Un sujet à moi ») : repliées sous les Propositions, qui restent en tête. Deux boutons secondaires de 2.75rem (12px) déplient chacun leur formulaire dans une carte simple, un seul à la fois ; le même bouton le replie, et le bouton ouvert prend un filet `accent`. Champs étiquetés, bouton plein de 2.75rem (« C'est parti » pour le sujet, « Réviser » pour la leçon de classe). Pas de bulle de validation du navigateur : les messages de l'appli, en tutoiement, s'affichent en `rouge` sous le bouton du formulaire concerné ; après le choix des photos, une ligne en `doux` confirme les pages prises (« 3 pages : … »). Le texte d'exemple des champs est en `doux` dans les deux thèmes (au moins 4,5:1 sur la carte).
- **Cadrage :** une boîte de dialogue modale native (`<dialog>`), carte de 18px à la pose de carte de ligne, posée sur le `voile`. « Question 1 sur 2 » en `doux`, la question en titre de section, qui nomme le sujet quand il est connu (« Pourquoi veux-tu apprendre « Les volcans » ? »), les réponses en boutons secondaires empilés (2.75rem de haut, 12px), « ✕ » en bouton secondaire carré dans le coin. Échap ou « ✕ » annule et rend le focus à la carte ou au bouton que l'Élève avait touché, mémorisé au toucher.
- **Carte d'attente :** après le Cadrage, une carte de 18px à la pose de carte de ligne, posée au centre sur le `voile` (le reste de l'écran est inerte), annoncée comme un état et jamais rouge. Elle nomme le sujet en titre de section, dessine la nouvelle ligne « en travaux » avec `ligneLecon` à la couleur de la Catégorie (`--ligne-autre` quand elle n'est pas connue), ses pointillés avançant tant que le prof prépare (coupés sous `prefers-reduced-motion`), dit la durée en `doux` et la suite en gras, et propose « ← Mes leçons », qui ne fait que naviguer. Si la préparation échoue, une carte d'erreur prend sa place, annoncée comme une alerte : le titre en `rouge`, le message du serveur, « Réessayer » en bouton plein, « Retour aux idées » en secondaire et « ← Mes leçons ». Les textes viennent de `public/nouvelle-lecon-texte.js`.
- **Jamais de bande de couleur sur le côté d'une carte** pour dire un type : `test/style.test.js` refuse toute bordure latérale plus épaisse qu'un filet.

## Do's and Don'ts

### Do:
- **Do** donner à chaque Leçon sa couleur de Catégorie par la variable `--ligne` posée sur sa carte ou sa section, à partir des jetons `ligne-*`.
- **Do** dire l'état d'un Objectif avec les quatre stations (vide, hachurée, blanche, verte) et doubler l'image d'un texte (titre, `aria-label`, ou mots dans le dépliant).
- **Do** réserver Overpass 800 aux titres, à la marque et aux cartouches de signalétique, et Atkinson Hyperlegible Next à tout le reste.
- **Do** garder des cibles tactiles d'au moins 2.75rem et l'anneau de focus de 3px `accent`.
- **Do** fournir chaque nouvelle couleur en clair et en sombre, et couper les transitions sous `prefers-reduced-motion`.
- **Do** ramener un écran hérité aux jetons et à la grammaire du réseau quand on le redessine.

### Don't:
- **Don't** modifier les couleurs de ligne sans une nouvelle version du Kit : elles sont partagées avec `public/kit/v1/quiz.css`.
- **Don't** afficher de pourcentage de Maîtrise ni de décompte « x Objectifs · x atteints » à l'Élève : la ligne et le mot de Maîtrise suffisent. De même, aucun « 7/15 » sur un Badge : sa ligne le dit.
- **Don't** employer un aplat vert pour autre chose que Retenu ou Acquis, ni le jaune `nouveau` pour autre chose que ce qui est nouveau.
- **Don't** revenir à une grille de cartes boutons identiques remplies de listes de texte.
- **Don't** poser d'ombre décalée ou dure, ni faire monter un élément au survol.
- **Don't** utiliser de capitales espacées hors des cartouches de signalétique.
- **Don't** reprendre comme modèle les valeurs codées en dur des écrans hérités (couleurs de Palier en dur, ombres noires en `rgba`).
