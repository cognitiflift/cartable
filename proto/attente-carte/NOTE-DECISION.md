> *Cette note a été rédigée par une IA à partir du prototype #198 ; les décisions ci-dessous sont celles de l'humain qui l'a joué.*

# Note de décision — attente d'une carte « en cours de façonnage » (#198 → #197)

Prototype jetable : `proto/attente-carte/` sur la branche `worktree-proto-attente-carte-198` (hors `main`). Lancer : `python3 -m http.server 8765` à la racine du dépôt, puis `http://127.0.0.1:8765/proto/attente-carte/index.html` (paramètres d'URL `cat`, `attente`, `max`, `auto=1`).

## Décision

Pendant que l'agent compose la carte, l'Élève voit **l'esquisse de la carte qui se dessine au trait, rejouée en boucle**, puis la cérémonie normale prend le relais sans coupure. Autres formats essayés et écartés (ils sont dans l'historique de la branche) : crescendo avec respiration, convoi, couches, crayonné, esquisse décalée élément par élément.

- **Une carte, une scène.** La carte vierge est la carte face cachée (mêmes rayures, même 5/7). Elle s'esquisse : cadre, étoiles, collines, ligne avec trois jalons pleins, motif d'atelier de la Catégorie, halo à la couleur de la Catégorie, un reflet qui la traverse.
- **Aucun héros** : la carte finale a un héros propre à la Leçon, composé par l'agent. L'esquisse n'en annonce pas un qui n'existerait pas ; le héros n'apparaît qu'avec la vraie carte (il « tombe » dans la cérémonie).
- **Pas de nombre de stations inventé** : la vraie carte a autant de stations que d'Objectifs ; l'esquisse montre trois jalons pleins qui ne se lisent pas comme un décompte.
- **Boucle** : l'esquisse se joue en entier à 1,15× (~6,3 s), fond en entier (0,8 s), puis repart de zéro. Un tour : ~7,6 s, tous identiques. Le premier passage doit être complet : l'accélération s'applique une fois la carte dans le document.
- **Transition sans coupure** : à l'arrivée de la carte, l'esquisse se met de profil (0,25 s, `rotateY(90°)`), la vraie carte revient du même angle avec le `cer-retourne` existant, puis couches, héros, gerbe et stations de la cérémonie d'aujourd'hui. **Aucun second geste** : l'Élève a déjà touché la carte.
- **Carte déjà prête (0 s)** : la cérémonie d'aujourd'hui, inchangée. **Échec** de composition : même transition vers la scène générique (#184), **sans mot d'échec**.
- **Sorties** : « Plus tard » à tout moment ; **repli à 60 s** : texte calme « Ta carte arrive, elle t'attend sur l'accueil. », la boucle s'arrête sur le dessin complet, le dialogue **reste ouvert** avec « Fermer » (pas de fermeture automatique : pas de limite de temps imposée, WCAG 2.2.1). La carte reste en attente sur l'accueil, rien n'est perdu.
- **Arrêt du mouvement (WCAG 2.2.2)** : bouton « Mettre en pause / Reprendre » visible dès le départ (libellé seul, sans `aria-pressed`). Pas d'immobilisation d'elle-même.
- **`prefers-reduced-motion`** : aucune boucle ni animation ; l'esquisse s'affiche fixe et complète, texte « Ta carte se prépare », pas de bouton Pause ; à l'arrivée la vraie carte remplace l'esquisse d'emblée. **La boucle étant pilotée en JS, l'implémentation doit lire `matchMedia('(prefers-reduced-motion: reduce)')` : le CSS global seul ne suffit pas** (il coupe les transitions mais laisserait la carte se vider brusquement à chaque tour).
- **Un seul texte, sans chiffre** : « Ta carte se prépare » (`PRODUCT.md` exclut les jauges ; la durée est inconnue).

## Décisions et fondements

| Décision | Choix | Cadre / solidité |
| --- | --- | --- |
| Occuper l'attente par le façonnage visible | Oui : esquisse au trait, couche par couche | Buell & Norton (2011), *Management Science* 57(9) : étude isolée sur adultes ; transposition à un enfant = heuristique |
| Variante par Catégorie | **Couleur + motif d'atelier** (plume, grille, orbites, constellation). La critique impeccable recommandait la couleur seule : le motif est discret et coûte un dessin par Catégorie ; choix assumé, **à rouvrir si les Élèves ne le remarquent pas** | Aucun cadre, hypothèse à mesurer |
| Durée de la boucle | ~7,6 s par tour, fondu de 0,8 s, sans immobilisation d'elle-même | Aucun cadre sur les durées ; WCAG 2.2.2 (pause) et 2.3.1 (pas de clignotement) pour les bornes |
| Repli | 60 s | Aucun cadre, hypothèse à mesurer (durée réelle de composition dans les journaux) |
| Mouvement arrêtable, état fixe sous mouvement réduit | Pause dès le départ ; esquisse fixe | WCAG 2.2 : 2.2.2, 2.3.3 ; norme |
| Pas de nombre de stations inventé, pas de héros | Trois jalons, aucun héros | Choix de conception (ne pas annoncer un contenu inexistant) |

Ces décisions sont inscrites dans `docs/cadres-scientifiques.md` (entrée « Illusion du travail », rubrique « Décisions sans fondement écrit ») sur la branche du prototype ; à reporter dans `main` avec #197.

## Critique impeccable du prototype : ce qui est retenu

| # | Constat | Décision |
| --- | --- | --- |
| 1 | Sous `prefers-reduced-motion`, la boucle tournait et vidait la carte | **Corrigé** : pas de boucle sous mouvement réduit |
| 2 | La carte se vide à chaque tour | **Gardé** : toute la carte fond entre deux tours |
| 3 | Fermeture automatique au repli | **Corrigé** : le dialogue reste ouvert |
| 4 | Pause tardive, `aria-pressed` et libellé changeant à la fois, code mort | **Corrigé** |
| 5 | Cinq stations inventées | **Corrigé** : trois jalons |
| 6 | Halo écrasant, étoiles nombreuses, orbites sur la ligne, traits fins, reflet invisible | **Corrigé** (halo réduit, 4 étoiles, orbites remontées, traits épais) ; **reflet conservé** |

Défaut trouvé en vérifiant : si le repli tombait pendant un fondu, la carte restait vide et figée ; au repli, le dessin est maintenant redessiné complet puis arrêté. À reproduire dans l'implémentation.

## Écarté

- **Barre ou pourcentage** : durée inconnue, `PRODUCT.md` exclut les jauges.
- **Pulsation ou éclats pour « faire patienter »** : risque de clignotement (WCAG 2.3.1) et fatigue au-delà de 15 s.
- **Retournement manuel à l'arrivée** : un second geste après une attente casse la continuité.
- **Fondu enchaîné esquisse → carte** : le retournement de profil réutilise la cérémonie existante, sans nouveau composant.
- **Héros dans l'esquisse** : annonce un contenu qui n'existe pas.
- **Motifs par Catégorie en plusieurs formats d'animation** (convoi, couches, crayonné) : écartés avec les variantes.

## Pour implémenter #197

Reprendre l'esquisse (dessin SVG, boucle JS à 1,15×, fondu de 0,8 s) dans `public/` en jetons uniquement ; le code du prototype n'est pas à copier tel quel (page jetable, sans tests). La cérémonie existante (`ceremonie()` dans `public/app.js`) fournit le retournement et la gerbe : l'attente se branche juste avant eux.
