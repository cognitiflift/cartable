# Note de décision — attente d'une carte « en cours de façonnage » (#198 → #197)

> Proposition issue du prototype jetable `proto/attente-carte/` (branche `worktree-proto-attente-carte-198`). Le jugement final (« effet wow », choix de variante) revient à l'humain qui joue le prototype ; ce qui suit est ce que j'ai observé et ce que je recommande.

Lancer : `python3 -m http.server 8765` à la racine du dépôt, puis `http://127.0.0.1:8765/proto/attente-carte/index.html` (paramètres d'URL `cat`, `attente`, `max`, `palier`, `auto=1`).

## Ce que montre le prototype

Format retenu par l'humain : **l'esquisse, rejouée en boucle** (autres variantes essayées et retirées : crescendo avec respiration, convoi, couches, crayonné, esquisse décalée élément par élément ; elles sont dans l'historique de la branche).

- **Une carte, une scène** : la carte vierge est la carte face cachée (mêmes rayures, même 5/7). Elle s'esquisse **au trait** : cadre, étoiles, collines, rail et stations, motif d'atelier, halo de la couleur de la Catégorie, un reflet. **Aucun héros** : la carte finale a un héros propre à la Leçon, composé par l'agent ; l'esquisse n'en annonce pas un qui n'existerait pas, et le héros n'apparaît qu'avec la vraie carte (il « tombe » dans la cérémonie).
- **Boucle** : l'esquisse est jouée en entier à 1,15× (~5,5 s), reste posée un instant, s'efface en fondu (0,8 s) puis repart de zéro. Un tour : ~7,6 s. Elle ne s'emballe pas et ne monte pas en puissance : chaque tour est identique.
- **Transition sans coupure** : à l'arrivée de la carte, l'esquisse se met de profil (0,25 s, `rotateY(90°)`), la vraie carte revient du même angle avec le `cer-retourne` existant, puis les couches, le héros, la gerbe et les stations de la cérémonie d'aujourd'hui. **Sans second geste**.
- **Durées** : 0 s (cérémonie actuelle), 3 s, 15 s, 60 s, échec (scène générique à 8 s, sans mot d'échec).
- **Sorties** : « Plus tard » à tout moment ; **délai maximal** : texte calme « Ta carte arrive, elle t'attend sur l'accueil. », la boucle s'arrête, fermeture 4,5 s plus tard.
- **Arrêt du mouvement (WCAG 2.2.2)** : bouton « Mettre en pause / Reprendre » dès 5 s **et** immobilisation d'elle-même (la boucle ne rejoue plus) après 28 s.
- **`prefers-reduced-motion`** : aucune animation ; état fixe, tout esquissé, « Ta carte se prépare ».

## Recommandation

| Décision | Recommandation | Cadre / solidité |
| --- | --- | --- |
| Occuper l'attente par le façonnage visible | Oui : esquisse au trait, couche par couche | Buell & Norton (2011), étude isolée sur adultes ; transposition = heuristique |
| Variante par Catégorie | **Couleur de la Catégorie seule** (halo, cadre, rail : jetons `--ligne-*`, coût nul) pour toutes les Catégories ; **motifs d'atelier écartés** de la livraison. Ils ajoutent 3 dessins à maintenir et à tester par Catégorie pour une différence discrète à 390 px. À rouvrir si les Élèves les remarquent. | Aucun cadre, hypothèse à mesurer |
| Boucle | Esquisse rejouée en boucle (~7,6 s par tour, fondu de 0,8 s) ; **immobile après 28 s** | Aucun cadre sur les durées ; WCAG 2.2.2 et 2.3.1 pour les bornes |
| Délai maximal avant repli | **45 s** (le 60 s du prototype retombe sur le texte calme) ; au-delà, la carte arrive seule sur l'accueil | Aucun cadre, hypothèse à mesurer (journaux : durée réelle de composition) |
| Échec | Silencieux : scène générique par la même transition | Choix de conception (#184) |
| Pas de texte chiffré | Un seul texte, « Ta carte se prépare » | `PRODUCT.md` ; durée inconnue |

## Écarté

- **Barre ou pourcentage** : durée inconnue, `PRODUCT.md` exclut les jauges.
- **Boucle d'éclats / pulsation rapide pour « faire patienter »** : risque de clignotement (WCAG 2.3.1) et fatigue au-delà de 15 s.
- **Retournement manuel à l'arrivée** : un second geste après une attente casse la continuité demandée.
- **Esquisse puis fondu enchaîné** : le retournement de profil réutilise la cérémonie existante, sans nouveau composant.

## Reste à faire (humain)

1. Jouer le prototype : 15 s et 60 s dans deux Catégories, à 390 px et sur grand écran ; confirmer ou infirmer « couleur seule ».
2. `/impeccable critique` sur la page, puis trancher.
3. Publier cette note (amendée) en commentaire de #197.
