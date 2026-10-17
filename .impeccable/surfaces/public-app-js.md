---
version: 1
slug: "public-app-js"
primary_target: "public/app.js"
related_targets: ["public/style.css","public/index.html"]
---

# Accueil de l'Élève

Scope: l'écran d'accueil d'un Élève (`ecranAccueil` dans public/app.js) et l'en-tête commun ; premier écran du nouveau monde visuel de Cartable, à étendre ensuite aux autres écrans.
Mode: Operate.

Audience et tâche : l'Élève (enfant de 8 à 15 ans, ou adulte) qui revient dans l'appli, sur tablette ou portable. En un clin d'œil : où il en est dans chaque Leçon, puis ce qu'il peut faire (continuer une Leçon, faire ses Révisions du jour, en commencer une nouvelle). Choix de l'utilisateur : les Leçons d'abord ; la journée et les récompenses restent discrètes.

Constraints: états des Objectifs fixés par l'utilisateur : point vide = pas encore évalué, point blanc hachuré = à confirmer, point blanc = atteint, point vert = Retenu. Pas de décompte « x Objectifs · x atteints » (redondant). Un bouton pour déplier la carte et voir la liste détaillée des Objectifs. En-tête : un badge avec le total d'Étoiles, qui ouvre Mes badges. Bandeau lundi→dimanche, jours tamponnés, Étoiles, Fusées et Badges gagnés par jour. Couleurs de Catégorie : celles du Kit.

## Direction contract

THESIS: chaque Leçon est une ligne du réseau, à la couleur de sa Catégorie, dont les Objectifs sont les stations. On lit d'un coup d'œil jusqu'où on est allé et ce qui tient. Refuse la grille de cartes boutons, toutes pareilles, avec des listes de texte.

OWN-WORLD: plan du réseau STIB. En-tête bleu nuit (#14182b) ; fond gris clair froid, cartes blanches (en sombre : fond #0f1220, cartes #1a1e30). Traits épais aux couleurs des Catégories du Kit, stations en anneau sur le trait, terminus « Acquis » en cartouche de signalétique. Overpass (signalétique) pour les titres et les noms de ligne, Atkinson Hyperlegible Next pour le texte, chiffres tabulaires. Une seule couleur pour ce qui est nouveau.

STORY: l'Élève voit ses lignes, repère celle où il en était, lit sa prochaine station et touche Continuer. Il voit sa semaine tamponnée et son total d'Étoiles sans qu'ils lui volent la vedette.

FIRST VIEWPORT: en-tête bleu nuit : 🎒 Cartable, puis à droite le badge ⭐ total (→ Mes badges), Profil et Changer. Dessous, le bandeau de la semaine, lundi→dimanche : un tampon par jour (vide, pâle, plein, 🛡️), avec les ⭐ 🚀 et Badges du jour ; à droite, l'Objectif du jour, la série et les Révisions du jour (bouton plein s'il y a des Questions dues). Puis « Mes leçons » et, à droite, « ✨ Apprendre quelque chose de nouveau ». Puis les Catégories en cartes de ligne, deux colonnes sur grand écran : nom de la Leçon, palier de Maîtrise, ligne et stations, terminus, prochaine station, Étoiles et Fusées, Continuer, déplier les Objectifs.

FORM: Plan du réseau, rang 1 de ma liste ordonnée (pick), avec ce que l'utilisateur a repris du Journal de classe (rang 3, tiré au sort) : le bandeau de la semaine. seed:bb990adead01b302

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
