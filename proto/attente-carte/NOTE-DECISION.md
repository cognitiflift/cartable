# Note de décision — attente d'une carte « en cours de façonnage » (#198 → #197)

> Proposition issue du prototype jetable `proto/attente-carte/` (branche `worktree-proto-attente-carte-198`). Le jugement final (« effet wow », choix de variante) revient à l'humain qui joue le prototype ; ce qui suit est ce que j'ai observé et ce que je recommande.

Lancer : `python3 -m http.server 8765` à la racine du dépôt, puis `http://127.0.0.1:8765/proto/attente-carte/index.html` (paramètres d'URL `cat`, `attente`, `max`, `palier`, `auto=1`).

## Ce que montre le prototype

Format retenu par l'humain : **l'esquisse, rejouée en boucle** (autres variantes essayées et retirées : crescendo avec respiration, convoi, couches, crayonné, esquisse décalée élément par élément ; elles sont dans l'historique de la branche).

- **Une carte, une scène** : la carte vierge est la carte face cachée (mêmes rayures, même 5/7). Elle s'esquisse **au trait** : cadre, étoiles, collines, rail et stations, motif d'atelier, halo de la couleur de la Catégorie, un reflet. **Aucun héros** : la carte finale a un héros propre à la Leçon, composé par l'agent ; l'esquisse n'en annonce pas un qui n'existerait pas, et le héros n'apparaît qu'avec la vraie carte (il « tombe » dans la cérémonie).
- **Boucle** : l'esquisse est jouée en entier à 1,15×, un reflet la traverse, elle fond en entier (0,8 s) puis repart de zéro. Un tour : ~7,6 s. Chaque tour est identique.
- **Transition sans coupure** : à l'arrivée de la carte, l'esquisse se met de profil (0,25 s, `rotateY(90°)`), la vraie carte revient du même angle avec le `cer-retourne` existant, puis les couches, le héros, la gerbe et les stations de la cérémonie d'aujourd'hui. **Sans second geste**.
- **Durées** : 0 s (cérémonie actuelle), 3 s, 15 s, 60 s, échec (scène générique à 8 s, sans mot d'échec).
- **Sorties** : « Plus tard » à tout moment ; **délai maximal (60 s)** : texte calme « Ta carte arrive, elle t'attend sur l'accueil. », la boucle s'arrête sur le dessin complet, le dialogue **reste ouvert** avec « Fermer » (pas de fermeture automatique : pas de limite de temps imposée).
- **Arrêt du mouvement (WCAG 2.2.2)** : bouton « Mettre en pause / Reprendre » visible dès le départ (libellé seul, sans `aria-pressed`). **Pas d'immobilisation d'elle-même** (décision de l'humain).
- **`prefers-reduced-motion`** : **écart assumé** (décision de l'humain, constat 1 de la critique non corrigé) : la boucle tourne aussi sous mouvement réduit, et la carte se vide un instant à chaque tour, ce qui contredit le critère du ticket #198 (« aucune animation, un état fixe »). **À rouvrir avant #197** : l'implémentation devra soit figer l'esquisse, soit traiter ce cas explicitement.

## Recommandation

| Décision | Recommandation | Cadre / solidité |
| --- | --- | --- |
| Occuper l'attente par le façonnage visible | Oui : esquisse au trait, couche par couche | Buell & Norton (2011), étude isolée sur adultes ; transposition = heuristique |
| Variante par Catégorie | **Couleur + motif d'atelier** (décision de l'humain, contre l'avis de la critique impeccable qui recommande la couleur seule). Le motif est le seul coût ; le garder suppose de le rendre lisible (version corrigée : motif sciences remonté, étoiles réduites, traits plus épais). À rouvrir si les Élèves ne le remarquent pas. | Aucun cadre, hypothèse à mesurer |
| Boucle | Esquisse rejouée en boucle (~7,6 s par tour, fondu de 0,8 s), **sans immobilisation** (pause à la demande) | Aucun cadre sur les durées ; WCAG 2.2.2 et 2.3.1 pour les bornes |
| Délai maximal avant repli | **60 s** ; au-delà, la carte arrive seule sur l'accueil | Aucun cadre, hypothèse à mesurer (journaux : durée réelle de composition) |
| Échec | Silencieux : scène générique par la même transition | Choix de conception (#184) |
| Pas de texte chiffré | Un seul texte, « Ta carte se prépare » | `PRODUCT.md` ; durée inconnue |

## Écarté

- **Barre ou pourcentage** : durée inconnue, `PRODUCT.md` exclut les jauges.
- **Boucle d'éclats / pulsation rapide pour « faire patienter »** : risque de clignotement (WCAG 2.3.1) et fatigue au-delà de 15 s.
- **Retournement manuel à l'arrivée** : un second geste après une attente casse la continuité demandée.
- **Esquisse puis fondu enchaîné** : le retournement de profil réutilise la cérémonie existante, sans nouveau composant.

## Reste à faire (humain)

1. Jouer le prototype en basculant **Actuelle / Corrigée** (réglage de la page, ou bouton dans la cérémonie) : 15 s, 120 s (repli), deux Catégories, 390 px, mouvement réduit.
2. `/impeccable critique` sur la page, puis trancher.
3. Publier cette note (amendée) en commentaire de #197.

## Critique impeccable : ce qui est retenu

| # | Constat | Décision |
| --- | --- | --- |
| 1 | Sous `prefers-reduced-motion`, la boucle tourne et vide la carte | **Gardé tel quel** (écart assumé, voir ci-dessus) |
| 2 | La carte se vide à chaque tour | **Gardé tel quel** (toute la carte fond) |
| 3 | Fermeture automatique au repli (WCAG 2.2.1) | **Corrigé** : le dialogue reste ouvert, « Fermer » |
| 4 | Pause tardive, `aria-pressed` et libellé changeant à la fois, code mort | **Corrigé** : pause dès le départ, libellé seul, code mort retiré |
| 5 | Cinq stations inventées | **Corrigé** : trois jalons pleins, non lisibles comme un décompte |
| 6 | Halo écrasant, étoiles nombreuses, orbites sur la ligne, traits fins, reflet invisible | **Corrigé** : halo réduit, 4 étoiles, orbites remontées, traits plus épais ; **reflet conservé** |

Défaut trouvé en vérifiant : si le repli tombait pendant un fondu, la carte restait vide figée ; au repli, le dessin est maintenant redessiné complet puis arrêté.
