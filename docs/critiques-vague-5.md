# Critiques de la vague 5 (#162, spec #145)

Méthode : `/impeccable critique`, deux évaluations isolées (A : revue de design ; B : détecteur et mesures navigateur), sur une copie de `eleves/` (profils robin, arnaud, milo), Chromium sans interface à 390, 820 et 1280 px, thèmes clair et sombre. Code évalué : tête de `vague-5` (effdec5) avant les petites corrections de ce ticket. La passe `polish` s'est faite sur les écrans touchés par la vague, d'après ces mêmes constats.

## Scores

| Cible | Précédent | Maintenant | Remarque |
|---|---|---|---|
| Accueil de l'Élève | 23/40 (2026-10-18 20:49) ; 25/40 sur la branche `accueil-lecon-en-tete` | **28/40** | +5 sur 23, +3 sur 25 |
| Vue parent | aucune critique antérieure | **24/40** | première mesure, sert de base |
| Page de leçon (coque, sélecteur, Kit) | non comparable : les deux critiques précédentes visaient les seuls schémas SVG (12 et 11, autre grille) | **27/40** | première mesure de la Page entière |

Limites : le quiz du Kit n'a été vu qu'en haut de page (pré-test) et sur le bas d'une Page ; aucune réponse n'a été cliquée, donc l'heuristique 9 de l'accueil et de la Page est notée « non éprouvée ». Les scores sont ceux d'un seul passage de l'évaluation A.

## Corrigé dans ce ticket (petit)

- Accueil à 390 px : « 3 jokers » et « Ta meilleure série » étaient collés sur une ligne ; chaque ligne d'état repasse à la ligne.
- Accueil à 390 px : le bouton « Apprendre quelque chose de nouveau » dépassait de 1,6 px à gauche (marge négative réduite).
- Page de leçon : le sélecteur de pages affichait le nom de fichier brut (`0002-une-chance-sur-combien`) ; il dit « Page 2 sur 3 ».
- Écran en erreur de chargement : message en anglais brut (« Failed to fetch ») remplacé par une phrase en français et un bouton Réessayer.
- `GET /favicon.ico` en 404 dans la console : icône vide déclarée.

## Écarts restants, ouverts en issues (needs-triage)

Issues #164 (Vue parent : hiérarchie), #165 (Vue parent : jargon), #166 (bandeau de l’accueil), #167 (cibles tactiles), #168 (emoji et noms accessibles), #169 (chargement et erreurs), #170 (Page de leçon et Kit), #171 (échelle typographique).
