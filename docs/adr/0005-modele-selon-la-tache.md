# Le Modèle et l'effort dépendent du type de tâche, avec un Modèle de secours à chaque appel

Jusqu'ici un seul Modèle, celui du Profil (Haiku par défaut), servait à tout. Les tâches sont pourtant très différentes : Haiku écrit des quiz trop faciles (100 % partout, un 100 % ne veut plus rien dire), tandis qu'un Modèle plus cher serait gaspillé pour une liste de Propositions. Avec l'abonnement Pro (ADR 0001), chaque appel consomme le quota partagé avec le parent : le Modèle doit être choisi là où la qualité compte, et l'appli ne doit pas bloquer l'Élève au milieu d'une Leçon quand le Modèle choisi n'est pas disponible.

Une table fermée, tenue par l'appli, associe donc à chaque type de tâche un Modèle et un niveau d'effort (`--effort` de `claude -p`) :

| Tâche | Modèle | Effort |
| --- | --- | --- |
| Première Séance (Cadrage, mission, Objectifs) | Modèle du Profil | `medium` |
| Page de leçon : Étape suivante, Revoir, Défi, Réviser | Modèle du Profil | `medium` |
| Propositions | Haiku | `low` |

Le Retour de quiz n'est plus une tâche du prof (ADR 0002) : il ne figure pas dans la table. Les nouveaux Profils ont Sonnet par défaut ; les Profils existants gardent leur Modèle, rien ne change sans l'accord du parent. Chaque appel passe aussi un **Modèle de secours** (`--fallback-model`) qui prend le relais quand le Modèle principal est surchargé ou indisponible ; le Modèle réellement utilisé est relevé avec le coût d'un tour.

Le Modèle de secours fait partie de la même table : il n'est jamais le Modèle principal (`claude` refuse un secours identique) et c'est le Modèle juste moins cher quand il existe, pour ménager le quota quand il s'épuise : Opus → Sonnet, Sonnet → Haiku. Haiku, le moins cher, a Sonnet pour secours ; c'est le cas des Propositions et des Profils réglés sur Haiku.

| Modèle principal | Modèle de secours |
| --- | --- |
| Opus | Sonnet |
| Sonnet | Haiku |
| Haiku | Sonnet |

## Considered Options

- Un seul Modèle pour tout, celui du Profil : rejeté, il est soit trop faible pour les pages, soit trop cher pour les Propositions.
- Opus par défaut pour les pages : rejeté, quota consommé trop vite pour un gain que rien ne mesure encore ; le parent peut le choisir dans le Profil.
- Laisser le prof choisir son Modèle ou son effort : rejeté, dans l'esprit de l'ADR 0002 les règles restent fixées par l'appli.
- Un Modèle de secours unique (Haiku) pour tous les appels : rejeté, il serait identique au Modèle principal des Propositions et des Profils réglés sur Haiku.
- Un Modèle de secours plus cher que le principal (Opus pour Sonnet) : rejeté, le secours sert justement quand le quota est sous tension.
- Passer les Profils existants à Sonnet : rejeté, le parent a peut-être choisi Haiku pour préserver son quota.

## Consequences

- Le choix du Modèle dans le Profil ne règle plus que les Pages de leçon ; les Propositions l'ignorent.
- La table se révise au vu du coût d'un tour mesuré, pas à l'intuition.
