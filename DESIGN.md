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
  accent: "#2747c9"
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
  accent-sombre: "#8aa2ff"
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
  title:
    fontFamily: "Overpass, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.3rem"
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
    backgroundColor: "{colors.nuit}"
    textColor: "{colors.sur-nuit}"
    rounded: "{rounded.bouton}"
    padding: "0.7rem 1.1rem"
  bouton-nouvelle-sombre:
    backgroundColor: "{colors.texte-sombre}"
    textColor: "{colors.fond-sombre}"
  bouton-ligne:
    backgroundColor: "color-mix(in srgb, var(--ligne) 82%, var(--encre-noire))"
    textColor: "{colors.sur-accent}"
    rounded: "{rounded.bouton}"
    padding: "0.55rem 1.15rem"
    height: "2.75rem"
  bouton-ligne-sombre:
    backgroundColor: "color-mix(in srgb, var(--ligne) 22%, var(--carte))"
    textColor: "{colors.texte-sombre}"
  compteur-etoiles:
    backgroundColor: "color-mix(in srgb, var(--sur-nuit) 12%, transparent)"
    textColor: "{colors.sur-nuit}"
    rounded: "{rounded.pilule}"
    padding: "0.3rem 0.9rem"
    height: "2.6rem"
  carte-ligne:
    backgroundColor: "{colors.carte}"
    textColor: "{colors.texte}"
    rounded: "{rounded.carte-ligne}"
    padding: "{spacing.carte-ligne}"
  ma-semaine:
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

Cartable se lit comme le plan d'un réseau de transport en commun (la STIB bruxelloise en est la référence) : chaque Leçon est une ligne épaisse à la couleur de sa Catégorie, ses Objectifs en sont les stations, et la ligne mène à un terminus « Acquis » posé en cartouche de signalétique. L'Élève voit d'un coup d'œil jusqu'où il est allé et ce qui tient en mémoire, sans pourcentage ni décompte. Au-dessus du réseau, un bandeau de la semaine, du lundi au dimanche, reprend la page de la semaine du journal de classe belge : un tampon par jour, et ce qui a été gagné ce jour-là.

Le monde est sobre et lisible : un en-tête bleu nuit, un fond gris froid, des cartes blanches posées à peine au-dessus du fond, une typographie de signalétique (Overpass) pour les titres et les noms de ligne, une police conçue pour la lisibilité (Atkinson Hyperlegible Next) pour tout le texte. La couleur est réservée au sens : la couleur de ligne dit la Catégorie, le bleu de l'accent dit l'action et aujourd'hui, le vert dit ce qui est Retenu, le jaune dit ce qui est nouveau. Il convient autant à un enfant de 8 ans qu'à un adulte : rien n'y est infantilisant, rien n'y est compétitif.

Le monde refuse la grille de cartes boutons toutes pareilles remplies de listes de texte. Il existe en clair et en sombre (fond `fond-sombre`, cartes `carte-sombre`), choisi par le bouton de thème de l'en-tête : automatique (la préférence de l'appareil, par défaut), clair ou sombre. Le choix vaut pour l'appareil, pas pour un Élève : retenu dans le stockage de l'appareil, il s'applique dès le choix de l'Élève, avant le premier rendu, et jusque dans les Pages de leçon en iframe. L'en-tête reste bleu nuit dans les deux.

**Frontière d'extension.** À ce jour, seuls l'écran d'accueil de l'Élève (bandeau de la semaine, « Mes leçons », cartes de ligne), la Séance (en-tête sur la ligne de la Leçon, bulle du prof, Retour de quiz, Rebond), Nouvelle leçon (Propositions et Cadrage), Mes badges et son calendrier, et les éléments communs (en-tête, compteur d'Étoiles, boutons, champs, jetons de couleur et polices) portent ce monde. Les autres écrans (choix de l'Élève, Révisions du jour, Vue parent, Profil) héritent des jetons et des polices mais n'ont pas été redessinés : ils gardent des valeurs antérieures (verts et ors codés en dur, ombres noires en `rgba`). Ces valeurs ne font pas partie du système ; la prochaine refonte d'un écran doit les ramener aux jetons et à la grammaire du réseau.

**Key Characteristics:**
- Une Leçon = une ligne de couleur de Catégorie, des stations, un terminus « Acquis ».
- Quatre états de station lisibles sans légende : vide, hachurée, blanche, verte.
- Bandeau lundi→dimanche à tampons, discret à côté des Leçons.
- Bleu nuit pour la marque et l'appel « nouveau », bleu accent pour l'action, vert pour ce qui tient.
- Overpass 800 en signalétique, Atkinson Hyperlegible Next pour lire, chiffres tabulaires.
- Plat par défaut, ombres douces teintées de nuit, aucun relief dur.

## Colors

Une palette froide et neutre où chaque teinte saturée porte un seul sens.

### Primary
- **Bleu de l'accent** (`accent`, `accent-sombre` en sombre) : l'action et le présent. Boutons pleins, tampon du jour plein ou pâle, cadre du jour courant, liens, anneau de focus (3px), sélection de texte (30 %).
- **Bleu nuit de la marque** (`nuit`) : l'en-tête dans les deux thèmes, et le bouton « Apprendre quelque chose de nouveau ». Le texte dessus est `sur-nuit`, le texte secondaire `sur-nuit-doux`.

### Secondary
- **Couleurs de ligne** (`ligne-francais`, `ligne-mathematiques`, `ligne-sciences`, `ligne-histoire`, `ligne-geographie`, `ligne-langues`, `ligne-arts`, `ligne-autre`, et leurs variantes `-sombre`) : la Catégorie d'une Leçon. Elles sont identiques à celles des Catégories du Kit (`public/kit/v1/quiz.css`), pour qu'une Leçon garde sa couleur de l'accueil à ses pages. En clair, les surfaces pleines (bouton Continuer, cartouche de Niveau) utilisent la ligne foncée (`color-mix(in srgb, var(--ligne) 82%, var(--encre-noire))`) avec du texte `sur-accent` (blanc) ; en sombre, la ligne elle-même avec du texte `sur-accent-sombre`.

### Tertiary
- **Vert Retenu** (`retenu`) : ce qui tient en mémoire. Station Retenue, terminus allumé, pastille « Acquis ✓ ».
- **Jaune Nouveau** (`nouveau`) : la seule couleur de ce qui est nouveau, distincte de toutes les couleurs de ligne, texte `sur-nouveau` bleu nuit : la pastille « Nouveau » (dans le compteur d'Étoiles et ailleurs).
- **Mots de Maîtrise** (`rouge`, `orange`, `vert`) : la couleur du texte des paliers « à revoir », « à consolider », « bien en tête », et de « Objectif du jour atteint ». Texte seulement, jamais en aplat.
- **Paliers des Badges** (`palier-bronze`, `palier-argent`, `palier-or`, `palier-diamant`, `palier-unique`, et leurs variantes `-sombre`) : l'anneau de la pastille d'un Badge, sur un fond pâle de la même teinte (`color-mix(in srgb, var(--palier) 18%, var(--carte))`). Les valeurs claires sont foncées et les sombres éclaircies pour que l'anneau tienne 3:1 contre la carte et contre son fond. Jamais en aplat plein, jamais hors d'une pastille de Badge.

### Neutral
- **Gris froid du fond** (`fond`) : le fond de page, sur lequel les cartes se détachent.
- **Blanc des cartes** (`carte`) : cartes de ligne, bandeau de la semaine, boutons secondaires, champs.
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
**La règle de la couleur de ligne.** La couleur d'une Catégorie n'appartient qu'à ses Leçons : le trait parcouru, la puce de la Catégorie, le cartouche de Niveau, le bouton Continuer et l'anneau « vous êtes ici ». Elle ne sert jamais à autre chose, et ses valeurs se changent dans une nouvelle version du Kit, jamais ici seul.

**La règle du vert qui tient.** Un aplat vert signifie Retenu ou Acquis, rien d'autre. Le vert des mots de Maîtrise reste du texte.

**La règle de la seule couleur du nouveau.** Ce qui est nouveau porte le jaune `nouveau`, et rien d'autre ne le porte en pastille.

## Typography

**Display Font:** Overpass (avec Atkinson Hyperlegible Next, system-ui)
**Body Font:** Atkinson Hyperlegible Next (avec system-ui, sans-serif)

**Character:** Overpass, dessinée d'après la signalétique routière, donne aux titres et aux cartouches la voix d'un panneau de station ; Atkinson Hyperlegible Next, dessinée pour les lecteurs malvoyants, porte tout ce qui se lit, y compris pour un Élève dyslexique. Les deux sont servies par l'appli (`public/polices/`, licence SIL OFL), en sous-ensembles latin et latin étendu, `font-display: swap`.

### Hierarchy
- **Display** (Overpass 800, 2rem, 1.1 ; 1.6rem sous 640px) : le titre « Mes leçons ».
- **Headline** (Overpass 800, 1.45rem, 1.1) : le salut du bandeau de la semaine ; les autres titres de section (`h2`) prennent la même voix Overpass 800.
- **Title** (Overpass 800, 1.3rem, 1.2 ; 1.15rem sous 640px) : le nom d'une Leçon sur sa carte de ligne, équilibré (`text-wrap: balance`). Les noms de Catégorie sont à 1.2rem, précédés de leur puce de couleur.
- **Marque** (Overpass 800, 1.35rem, 1) : « 🎒 Cartable » dans l'en-tête.
- **Body** (Atkinson 400, 17px, 1.5) : tout le texte courant ; les détails (prochaine station, Objectifs) passent à 1.3–1.35 d'interligne.
- **Petit texte d'action** (Atkinson 700, 0.92rem) : « Voir les Objectifs », contrôle à venir, « Terminée ».
- **Label signalétique** (Overpass 800, 0.74rem, 0.07em, capitales) : le terminus « ACQUIS » et les noms de jours du bandeau. Le cartouche de Niveau est à 0.78rem, 0.04em.

### Named Rules
**La règle de la signalétique.** Les capitales espacées sont réservées aux cartouches de signalétique du réseau (terminus, Niveau, noms de jours) ; aucun texte courant, aucun titre n'est en capitales.

**La règle des chiffres alignés.** Les compteurs (Étoiles, Fusées, dates des tampons, total de l'en-tête) sont en chiffres tabulaires.

## Layout

Une colonne centrée de 1200px au plus, avec une marge latérale fluide (`clamp(1rem, 3vw, 2rem)`), partagée par l'en-tête et le contenu. L'accueil se lit de haut en bas : le bandeau de la semaine, puis l'en-tête « Mes leçons » avec le bouton « Apprendre quelque chose de nouveau » aligné à droite, puis une section par Catégorie.

Le bandeau de la semaine est une grille de deux colonnes : les sept jours (une grille de 7 colonnes égales) et, à droite, une colonne de 16 à 20rem pour l'Objectif du jour, la série et les Révisions du jour. Sous 860px, la colonne passe dessous ; sous 520px, le bandeau se resserre (tampons de 2rem, gains empilés, lien du calendrier masqué).

Les cartes de ligne d'une Catégorie forment une grille fluide (`minmax(min(100%, 31rem), 1fr)`, écart 1rem) : deux colonnes sur grand écran, une sur tablette en portrait et sur téléphone. Toutes les cartes ont la même anatomie : tête (Niveau, nom, mot de Maîtrise), ligne, pied (prochaine station, contrôle, récompenses, Continuer), puis le dépliant des Objectifs.

Le rythme vertical : 2.2rem avant « Mes leçons », 1.4rem entre Catégories, 1rem entre cartes, 0.85rem entre les rangs d'une carte. L'en-tête masque l'âge sous 900px, le pseudo sous 640px et le nom « Cartable » sous 480px, en gardant toujours le compteur d'Étoiles, Profil, Changer et le bouton de thème.

## Elevation & Depth

Le système est plat, avec un soupçon de pose : les cartes de ligne et le bandeau de la semaine reposent sur le fond gris froid grâce à leur bordure `bord` et à une ombre ambiante très diffuse teintée de bleu nuit (`--ombre: 20 24 43`, noir en sombre). Il n'y a que deux poses, déclarées en variables sur le `:root` de `public/style.css` : `--ombre-carte` et `--ombre-bandeau`. Hors des cartes de ligne et du bandeau, seuls trois éléments en portent une : les cartes de Séance posées sur la Page de leçon et la boîte de dialogue du Cadrage prennent la pose de carte de ligne, le calendrier de Mes badges la pose du bandeau. Les cartes simples n'en ont pas. La profondeur sur la ligne est faite de halos : le terminus et la station « vous êtes ici » sont détourés d'un anneau à la couleur de la carte, qui les découpe du trait.

### Shadow Vocabulary
- **Pose de carte de ligne** (`--ombre-carte` : `0 1px 2px rgb(var(--ombre) / .06), 0 6px 18px rgb(var(--ombre) / .05)`) : les cartes de Leçon, en Séance les cartes posées sur la Page de leçon (bulle du prof, Retour de quiz, Leçon terminée), et le Cadrage de Nouvelle leçon.
- **Pose du bandeau** (`--ombre-bandeau` : `0 2px 10px rgb(var(--ombre) / .05)`) : le bandeau de la semaine et le calendrier de Mes badges.
- **Vous êtes ici** (`box-shadow: 0 0 0 .2rem var(--carte), 0 0 0 .42rem var(--ligne)`) : la prochaine station.
- **Découpe du terminus** (`box-shadow: 0 0 0 .2rem var(--carte)`) : sépare le cartouche du trait.
- **Jour courant** (`box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 45%, transparent)`) : le cadre d'aujourd'hui dans le bandeau et le calendrier.

### Named Rules
**La règle de la pose légère.** Les ombres sont ambiantes et teintées de nuit, jamais décalées ni dures ; un élément ne monte pas au survol, il change de teinte.

## Shapes

Des cartes aux coins francs mais doux (18px pour les cartes de ligne et le bandeau, 14px pour les cartes simples), des boutons à 12px (10px pour les boutons et champs de base), des cartouches de signalétique plus carrés (terminus 8px, Niveau 7px, puce de Catégorie 6px). Les pilules (999px) sont réservées aux compteurs et pastilles (Étoiles de l'en-tête, « Nouveau », « Acquis ✓ »). Les stations et les tampons sont des cercles.

Le trait de ligne est une barre de 0.55rem d'épaisseur, coupée en tronçons entre les stations. Une Leçon sans Objectifs montre une ligne « en travaux » : un trait en tirets à la couleur de ligne, à 55 % d'opacité. Le pointillé est un matériau natif du monde : tampons vides en tirets, jours futurs en points, séparateur des Objectifs en tirets.

## Components

### Buttons
Francs et pleins, toujours à au moins 2.6–2.75rem de haut pour le doigt.
- **Shape:** coins doux (10px de base ; 12px pour les boutons d'accueil et Continuer).
- **Bouton plein :** fond `accent`, texte `sur-accent`, graisse 700. Au survol, l'accent se mélange de 12 % d'encre ; transition de fond 0.15s.
- **Bouton secondaire :** fond `carte`, filet `bord`, texte `texte`, graisse 600 ; au survol, 6 % d'encre. Dans l'en-tête, il devient transparent avec un filet `sur-nuit` à 32 % et un survol `sur-nuit` à 10 %.
- **Continuer (bouton de ligne) :** fond de la ligne foncée, texte blanc, graisse 800, 2.75rem de haut ; au survol, `brightness(1.1)` ; à l'appui, descend d'1px. En sombre, il devient un aplat de ligne à 22 % sur la carte, cerclé de 2px de couleur de ligne, texte `texte`.
- **Thème (en-tête) :** bouton secondaire de l'en-tête réduit à son icône (🌗 automatique, ☀️ clair, 🌙 sombre) ; un clic passe d'automatique à clair, à sombre, puis revient à automatique. Son nom accessible (et son infobulle) dit le thème courant et l'action : « Thème : clair. Passer au thème sombre ».
- **Apprendre quelque chose de nouveau :** fond `nuit`, texte `sur-nuit` ; en sombre, il s'inverse (fond `texte-sombre`, texte `fond-sombre`).
- **Révisions du jour :** bouton plein à deux lignes (titre fort, détail en petit) quand des Questions sont dues, secondaire sinon.
- **Rebond (Séance) :** la suite recommandée après un quiz est un bouton plein à deux lignes (action en 800, score du quiz en petit), 12px, 2.75rem de haut ; les autres Rebonds sont des boutons secondaires. Aucun bouton ne pulse.
- **Focus :** anneau de 3px `accent`, décalé de 2px, sur tout élément.
- **Désactivé :** opacité 0.5.

### Chips
- **Compteur d'Étoiles :** pilule `sur-nuit` à 12 % sur la nuit (20 % au survol), ⭐ et total en chiffres tabulaires 800 ; ouvre Mes badges.
- **Nouveau :** pilule `nouveau`, 0.75rem, graisse 700.
- **Acquis ✓ :** pilule `retenu` sur le mot de Maîtrise, là où aucune ligne ne l'accompagne. Sur une carte de ligne comme dans l'en-tête de la Séance, une Leçon acquise ne le dit qu'une fois : par le terminus allumé, qui porte la Maîtrise en infobulle.
- **Niveau :** cartouche de ligne foncée, capitales Overpass.

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
- **Retour de quiz :** carte 18px à pose légère en bas à droite, bouton ✕ secondaire de 2.6rem, au-dessus du Rebond.
- **Leçon terminée :** carte 18px à pose légère, « 🏆 Leçon terminée » en Title Overpass, score du Défi et récompenses dessous.

### Le bandeau de la semaine
Du lundi au dimanche, un tampon rond par jour, avec le nom du jour en label signalétique au-dessus et les gains du jour (⭐, 🚀, pastilles de Badge, 📅 contrôle) dessous.
- **Vide :** contour en tirets `station-vide`, date en `doux` ; **futur :** contour en points, date atténuée.
- **Pâle (travaillé) :** aplat d'accent à 22 % sur la carte.
- **Plein (Objectif du jour atteint) :** aplat `accent`, date `sur-accent`.
- **Joker :** 🛡️ en exposant sur le tampon.
- **Aujourd'hui :** la colonne du jour est teintée d'accent à 9 % et cerclée d'accent à 45 %, son nom passe en `accent`.

### Mes badges
L'en-tête de page (« Mes badges » en display, le total d'Étoiles et de Fusées à droite en chiffres tabulaires), puis deux colonnes (une seule sous 900px) : le calendrier à gauche, la collection à droite.
- **Calendrier :** une carte comme le bandeau de la semaine (18px, pose du bandeau), le mois en titre entre deux boutons secondaires ‹ ›, les noms de jours en label signalétique, puis un tampon de jour par date, le même que le bandeau (`tamponJour` dans `public/app.js`) : vide, futur, pâle, plein, 🛡️ Joker, aujourd'hui. Chaque jour est un bouton ; le jour touché est entouré d'un anneau `texte` détouré de la carte, comme « vous êtes ici », et son détail (Leçons, quiz, Révisions du jour, gains) s'affiche sous un filet pointillé. Aujourd'hui est montré à l'ouverture.
- **Collection :** des cartes simples, la pastille du Badge à gauche, le nom, les Paliers obtenus avec leur date et la progression à côté ; un Badge pas encore obtenu est grisé.

### Propositions et Cadrage (Nouvelle leçon)
- **Proposition :** carte simple cliquable (14px, filet, pas d'ombre), dans une grille fluide (`minmax(min(100%, 17rem), 1fr)`). Elle porte la couleur de sa Catégorie par `--ligne`, seulement sur sa puce. Son type est dit en mots dans une cartouche de signalétique (Overpass 800, 0.74rem, capitales) : **Pour aller plus loin** (une suite) en aplat de ligne foncée, comme le cartouche de Niveau, puisqu'elle prolonge une ligne déjà ouverte ; **Nouveau sujet** en filet `station-vide`, texte `doux`, comme le terminus éteint. « 🎒 Au programme » est un mot gras à côté, sans pastille. Puis le titre (Overpass 800, 1.15rem), la Catégorie en `doux` derrière sa puce, et l'accroche.
- **Les deux autres voies** (réviser une leçon de classe, apprendre ce que tu veux) : deux cartes simples côte à côte sous les Propositions (une seule colonne sur téléphone), titre en Headline, champs étiquetés, bouton plein de 2.75rem.
- **Cadrage :** une boîte de dialogue modale native (`<dialog>`), carte de 18px à la pose de carte de ligne, posée sur le `voile`. « Question 1 sur 2 » en `doux`, la question en titre de section, qui nomme le sujet quand il est connu (« Pourquoi veux-tu apprendre « Les volcans » ? »), les réponses en boutons secondaires empilés (2.75rem de haut, 12px), « ✕ » en bouton secondaire carré dans le coin. Échap ou « ✕ » annule et rend le focus à la carte ou au bouton que l'Élève avait touché, mémorisé au toucher.
- **Jamais de bande de couleur sur le côté d'une carte** pour dire un type : `test/style.test.js` refuse toute bordure latérale plus épaisse qu'un filet.

## Do's and Don'ts

### Do:
- **Do** donner à chaque Leçon sa couleur de Catégorie par la variable `--ligne` posée sur sa carte ou sa section, à partir des jetons `ligne-*`.
- **Do** dire l'état d'un Objectif avec les quatre stations (vide, hachurée, blanche, verte) et doubler l'image d'un texte (titre, `aria-label`, ou mots dans le dépliant).
- **Do** réserver Overpass 800 aux titres, à la marque et aux cartouches de signalétique, et Atkinson Hyperlegible Next à tout le reste.
- **Do** garder des cibles tactiles d'au moins 2.6rem et l'anneau de focus de 3px `accent`.
- **Do** fournir chaque nouvelle couleur en clair et en sombre, et couper les transitions sous `prefers-reduced-motion`.
- **Do** ramener un écran hérité aux jetons et à la grammaire du réseau quand on le redessine.

### Don't:
- **Don't** modifier les couleurs de ligne sans une nouvelle version du Kit : elles sont partagées avec `public/kit/v1/quiz.css`.
- **Don't** afficher de pourcentage de Maîtrise ni de décompte « x Objectifs · x atteints » à l'Élève : la ligne et le mot de Maîtrise suffisent.
- **Don't** employer un aplat vert pour autre chose que Retenu ou Acquis, ni le jaune `nouveau` pour autre chose que ce qui est nouveau.
- **Don't** revenir à une grille de cartes boutons identiques remplies de listes de texte.
- **Don't** poser d'ombre décalée ou dure, ni faire monter un élément au survol.
- **Don't** utiliser de capitales espacées hors des cartouches de signalétique.
- **Don't** reprendre comme modèle les valeurs codées en dur des écrans hérités (couleurs de Palier en dur, ombres noires en `rgba`).
