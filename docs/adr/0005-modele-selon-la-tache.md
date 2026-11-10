# Le Modèle et l'effort dépendent du type de tâche, avec un Modèle de secours à chaque appel

Jusqu'ici un seul Modèle, celui du Profil (Haiku par défaut), servait à tout. Les tâches sont pourtant très différentes : Haiku écrit des quiz trop faciles (100 % partout, un 100 % ne veut plus rien dire), tandis qu'un Modèle plus cher serait gaspillé pour une liste de Propositions. Avec l'abonnement Pro (ADR 0001), chaque appel consomme le quota partagé avec le parent : le Modèle doit être choisi là où la qualité compte, et l'appli ne doit pas bloquer l'Élève au milieu d'une Leçon quand le Modèle choisi n'est pas disponible.

Une table fermée, tenue par l'appli, associe donc à chaque type de tâche un Modèle et un niveau d'effort (`--effort` de `claude -p`) :

| Tâche | Modèle | Effort |
| --- | --- | --- |
| Première Séance (Cadrage, mission, Objectifs) | Modèle du Profil | `medium` |
| Page de leçon : Étape suivante, Revoir, Défi, Réviser | Modèle du Profil | `medium` |
| Propositions | Haiku | `low` |
| Variantes des Questions (en arrière-plan) | Haiku | `low` |
| Carte de ligne (en arrière-plan, à l'Acquisition) | Sonnet | `medium` |

Le Retour de quiz n'est plus une tâche du prof (ADR 0002) : il ne figure pas dans la table. Les nouveaux Profils ont Sonnet par défaut ; les Profils existants gardent leur Modèle, rien ne change sans l'accord du parent. Chaque appel passe aussi un **Modèle de secours** (`--fallback-model`) qui prend le relais quand le Modèle principal est surchargé ou indisponible ; le Modèle réellement utilisé est relevé avec le coût d'un tour.

`--fallback-model` ne couvre que la surcharge ou l'indisponibilité du Modèle principal, pas l'épuisement du quota de l'abonnement : `claude` n'a aucune option pour basculer sur un autre Modèle dans ce cas, et l'appel échoue (l'appli dit alors à l'Élève de réessayer plus tard).

Le Modèle de secours fait partie de la même table : il n'est jamais le Modèle principal (`claude` refuse un secours identique au Modèle principal) et c'est le Modèle juste moins cher quand il existe, pour ménager le quota déjà sous tension : Opus → Sonnet, Sonnet → Haiku. Haiku, le moins cher, n'a pas de Modèle moins cher que lui ; un secours Haiku serait refusé, c'est donc Sonnet qui le relaie, ce qui concerne les Propositions, les Variantes et les Profils réglés sur Haiku.

| Modèle principal | Modèle de secours |
| --- | --- |
| Opus | Sonnet |
| Sonnet | Haiku |
| Haiku | Sonnet |

### Mise à jour : le type de tâche « carte » (spec #182, ticket #184)

Quand une Leçon devient Acquise pour la première fois, l'appli enregistre sa **carte de ligne** « à composer » (`lib/cartes.js`). Le prof compose alors, **à l'Acquisition** et non à l'ouverture de la collection, une scène SVG à trois calques (`l1`, `l2`, `heros`) : c'est le nouveau type de tâche **carte**. Il est fixé à Sonnet, effort `medium`, secours Haiku, **indépendamment du Modèle du Profil** : un dessin exact et lisible demande plus qu'une liste de Propositions, et composer à l'Acquisition, en arrière-plan, évite que l'Élève attende quoi que ce soit (la carte est prête quand il retourne la carte, ou presque).

Règles de la composition (`server.js`, `composerCartes`) : une seule composition à la fois par Élève, lancée seulement quand aucune tâche de Séance (tour du prof, page préparée) ne travaille pour lui, relancée à la fin de la Séance et au démarrage du serveur (une carte « en composition » redevient « à composer »). L'agent reçoit la Trousse (`lib/carte-agent.js`) et répond un objet JSON ; l'appli filtre chaque calque en liste blanche (`lib/carte-svg.js`) et ne stocke que ce qui est conforme. Un calque refusé, une réponse illisible ou une panne sont un échec de la tentative ; **deux tentatives au plus**, puis la carte reçoit sa **scène générique**, composée en code (`lib/carte-generique.js`), sans nouvel appel au prof. Le Coût de chaque tour, réussi ou non, est rattaché à la Leçon (`parTache.carte`).

| Décision | Cadre | Solidité |
| --- | --- | --- |
| Composition à l'Acquisition, en arrière-plan, Sonnet | Aucun cadre : décision de coût, mesurée par le Coût d'un tour « carte » | Aucun cadre, hypothèse à mesurer |
| Animations bornées, sans clignotement rapide (consigne de la Trousse) | WCAG 2.2, critères 2.2.2 et 2.3.1 | Norme |

Mesure (ticket #190) : les choix de cette mise à jour se jugent dans les indicateurs de la Vue parent (`lib/indicateurs.js`, `cartes`), lus dans le fichier de cartes et dans le Coût des tours « carte » : cartes composées contre scènes de repli, échecs de composition (essais perdus) et coût moyen d'une carte (échecs compris). Ils ne demandent aucun suivi de plus de l'Élève.

## Considered Options

- Un seul Modèle pour tout, celui du Profil : rejeté, il est soit trop faible pour les pages, soit trop cher pour les Propositions.
- Opus par défaut pour les pages : rejeté, quota consommé trop vite pour un gain que rien ne mesure encore ; le parent peut le choisir dans le Profil.
- Laisser le prof choisir son Modèle ou son effort : rejeté, dans l'esprit de l'ADR 0002 les règles restent fixées par l'appli.
- Un Modèle de secours unique (Haiku) pour tous les appels : rejeté, il serait identique au Modèle principal des Propositions et des Profils réglés sur Haiku.
- Un Modèle de secours plus cher que le principal (Opus pour Sonnet) : rejeté, le secours sert justement quand le quota est sous tension.
- Passer les Profils existants à Sonnet : rejeté, le parent a peut-être choisi Haiku pour préserver son quota.

## Consequences

- Le choix du Modèle dans le Profil ne règle plus que les Pages de leçon ; les Propositions et les Variantes l'ignorent.
- La table se révise au vu du coût d'un tour mesuré, pas à l'intuition.
