# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Élève (utilisateur principal).** Un enfant de la famille, du primaire au secondaire belge francophone (par exemple Robin, 10 ans, Primaire 6), qui apprend seul avec l'agent enseignant (le prof) : il révise une leçon de l'école à partir d'un Document source, ou explore un sujet de son choix. Il se reconnaît par son Pseudo, sans mot de passe.
- **Élève adulte.** Un adulte de la famille peut aussi être Élève (profil réel, 42 ans, niveau « Autre ») : l'interface doit lui convenir autant qu'à un enfant, sans l'infantiliser.
- **Parent (utilisateur secondaire).** Crée et règle les Profils, consulte la Vue parent (révisions, Objectifs Retenus ou fragiles, contrôles à venir, Coût des Leçons) et fournit la machine et l'abonnement Claude Pro sur lesquels tout tourne.

## Product Purpose

Cartable est une interface locale, en français, qui permet à un Élève d'apprendre avec un agent enseignant (le skill `teach` lancé par `claude -p`). Le prof écrit les Pages de leçon une à une selon l'avancée de l'Élève ; l'appli tient elle-même les règles : quiz du Kit, Objectifs, Maîtrise, mémoire (FSRS), Révisions du jour, Étoiles, Fusées et Badges.

Le succès, c'est ce qui **reste en mémoire** dans le temps (Objectifs Retenus, Questions qui tiennent), pas la réussite du moment juste après avoir lu une page.

## Positioning

Un prof qui écrit pour un seul Élève, sans plan fixé d'avance, encadré par une appli qui fixe toutes les règles d'évaluation et de mémoire. L'Élève n'écrit jamais : il répond seulement par des Réponses proposées. La révision espacée et entrelacée est servie par l'appli sans tour du prof ni token. Tout reste sur la machine de la famille, avec l'abonnement Pro du parent ; rien n'est hébergé.

## Operating Context

- Servi en local (`node server.js`) sur le réseau de la maison ; ouvert dans un navigateur sur **tablette ou ordinateur portable** (les deux comptent). Le téléphone est un plus, pas une exigence.
- Usage tactile et souris/trackpad.
- Les Leçons de révision partent de documents réels de l'école : scans ou photos de cahiers manuscrits, pages imprimées (PDF, JPEG).
- Les tours du prof prennent du temps (appel à `claude -p`) et partagent le quota Pro avec le parent : l'attente, les échecs de quota et la Page préparée font partie de l'expérience.
- Rituel quotidien : Objectif du jour, Révisions du jour, Série de jours avec Jokers hebdomadaires, récapitulatif de la semaine.

## Capabilities and Constraints

- Le vocabulaire du domaine est fixé dans `CONTEXT.md` (Élève, Leçon, Séance, Page de leçon, Rebond, Maîtrise et ses paliers, Retenu, Badge, Palier…) ; l'interface emploie ces mots et évite les termes listés en « _Avoid_ ».
- Décisions durables dans `docs/adr/` : Claude Code local avec abonnement Pro (0001), Séance sans saisie libre (0002), progression par Objectifs sans plan (0003), Kit servi par l'appli (0004), Modèle selon la tâche (0005), mémoire gérée par l'appli (0006).
- Le **Kit** (`public/kit/v1/`) fournit le quiz et le style de base de chaque nouvelle Page de leçon, versionné : une évolution incompatible passe par une nouvelle version. Le prof garde la liberté d'ajouter des composants propres au sujet.
- Stack existante : serveur Node sans framework (`server.js`, `lib/`), front en JavaScript et CSS natifs (`public/`), tests `node --test`.
- La Maîtrise s'affiche en mots colorés (à revoir, à consolider, bien en tête, Acquis ✓), sans pourcentage visible pour l'Élève.
- Jamais de comparaison entre Élèves, jamais de classement.
- Lecture à voix haute optionnelle par la voix de l'appareil ; aucun texte ne sort de l'appareil.
- Mode sombre et couleur par Catégorie font partie du Kit.

## Brand Commitments

- Nom : **Cartable**, avec l'emoji 🎒 dans l'en-tête actuel.
- Langue : français, tutoiement de l'Élève.
- Les récompenses saluent l'effort, les bonnes habitudes et ce qui reste en mémoire, presque jamais la performance. Les Retours de quiz restent bienveillants, y compris sur un écart entre ce que l'Élève pensait savoir et ce qu'il a trouvé.
- Emojis déjà engagés dans le domaine : ⭐ Étoiles, 🚀 Fusées, 🛡️ Jokers, 🔊 Lecture à voix haute, 🤷 « Je ne sais pas ».

## Evidence on Hand

- Deux Profils réels (`eleves/robin`, `eleves/arnaud`, non versionnés) avec leurs Leçons, Badges et journaux.
- Documents sources d'exemple dans `exemples/` (non versionnés).
- Retours d'essais réels cités dans les ADR (par exemple « 100 % acquis » dès la première page, sept Leçons et sept quiz différents).
- Aucun témoignage, aucune donnée chiffrée d'efficacité à présenter, aucune autre famille utilisatrice : ne pas en inventer.

## Product Principles

1. **L'appli fixe les règles, le prof enseigne.** Évaluation, mémoire et récompenses sont calculées par l'appli ; le prof garde le choix et le contenu des pages.
2. **Ce qui reste compte plus que la réussite du moment.** L'interface valorise Retenu et la mémoire dans le temps, pas un 100 % juste après lecture.
3. **L'Élève touche, il n'écrit pas.** Chaque interaction est un choix fermé, toujours avec « Je ne sais pas ».
4. **Encourager l'effort, jamais comparer.** Pas de classement, pas de punition ; une pause n'efface pas ce qui est acquis.
5. **Local, sobre en quota.** Ce qui peut être servi sans tour du prof l'est ; le coût d'un tour reste visible pour le parent.

## Accessibility & Inclusion

- Bonnes pratiques générales (WCAG AA) comme base.
- Un Élève peut avoir des difficultés de lecture (dyslexie) ou d'attention : textes courts et lisibles, peu de lecture obligatoire, une chose à faire à la fois. La Lecture à voix haute en fait partie.
- Cibles tactiles confortables pour la tablette.
- Doit rester lisible et respectueux pour un Élève adulte comme pour un enfant de 8 ans.
