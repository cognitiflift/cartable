# La mémoire est gérée par l'appli, pas par le prof

La répétition espacée est le levier le mieux démontré pour retenir à long terme (Cepeda et al. 2006, 2008 ; Dunlosky et al. 2013), et Cartable n'en avait pas. L'espacement dépendait de ce que le prof pensait à remettre dans le quiz suivant, et seulement si l'Élève revenait de lui-même dans **cette** Leçon : le prof ne se réveille jamais tout seul. La consigne « organise la révision espacée », transmise une fois avec la date de contrôle d'une Leçon de révision, ne programmait rien. La Maîtrise baissait en ligne droite (moins 10 points par semaine après trois semaines sans quiz), alors qu'on oublie surtout au début, et de moins en moins vite à chaque révision réussie. Enfin, chaque révision coûtait un ou plusieurs tours du prof (attente, tokens), alors que l'essentiel d'une révision, c'est reposer des questions déjà écrites.

L'appli prend donc la mémoire en charge, dans l'esprit des ADR 0002 et 0003 : les règles sont fixées par l'appli, le prof garde l'enseignement.

- **Banque de Questions.** Chaque question de quiz du Kit (hors questions bonus et hors Pré-test) devient une **Question** de la Leçon, gardée par l'appli avec son contenu et identifiée de façon stable (Leçon, page, identifiant dans la page). Les anciennes Leçons, d'avant le Kit, n'ont pas de Questions.
- **FSRS.** L'état de mémoire de chaque Question (stabilité, difficulté, probabilité de s'en souvenir, prochaine révision) est calculé par FSRS (Ye, 2022), l'algorithme libre de répétition espacée utilisé par Anki, avec ses paramètres par défaut publiés et une rétention visée de 90 %. Faux ou « Je ne sais pas » vaut « à revoir », juste mais pas sûr « difficile », juste et sûr « bien » : la Confiance sert enfin à planifier.
- **Le journal des réponses est la source de vérité.** Chaque réponse à une Question, dans un quiz de page ou une Révision du jour, est ajoutée à son journal (date, juste, sûr, « Je ne sais pas », origine). L'état de mémoire n'est jamais stocké comme vérité : un module de fonctions pures le recalcule à la lecture, comme les Objectifs, les Étoiles et Retenu. Si l'algorithme ou ses paramètres changent, rien n'est perdu ni à migrer.
- **Révisions du jour sans le prof.** Les Questions dues, mélangées entre Leçons (espacement et entrelacement), sont servies par séries de 10 au plus, tout de suite, sans tour du prof ni token. Le prof n'intervient qu'en arrière-plan, sur le Modèle le moins cher, pour écrire des variantes d'une Question vue deux ou trois fois ; elles partagent son état de mémoire.
- **Maîtrise = probabilité de se souvenir.** La Maîtrise d'une Leçon devient la probabilité moyenne de se souvenir aujourd'hui de ses Questions, avec les mêmes paliers (50 % et 80 %). Retenu s'appuie sur la stabilité des Questions qui couvrent l'Objectif. Une Leçon sans Questions garde les anciens calculs.
- **Date de contrôle.** Gardée dans l'état de la Leçon de révision, elle resserre les intervalles pour que chaque Question soit revue peu avant la date, et donne la priorité à cette Leçon dans les Révisions du jour. La consigne « organise la révision espacée » disparaît du prompt du prof.
- **Une Leçon terminée continue d'être révisée.** Elle reste terminée, avec ses Étoiles (ADR 0003), mais ses Questions continuent de revenir dans les Révisions du jour : le Défi réussi n'est plus un signal d'arrêt au moment où la consolidation devrait commencer.

## Considered Options

- Laisser le prof organiser l'espacement (consignes dans le prompt, Questions fragiles réinjectées) : rejeté comme mécanisme principal, le prof ne se réveille jamais tout seul et chaque révision coûte un tour. Il reçoit seulement, en début de page, les deux ou trois Questions les plus fragiles de la Leçon, qu'il peut réinjecter.
- Faire écrire au prof un quiz de révision à chaque séance : rejeté, attente et tokens pour reposer des questions déjà écrites.
- Intervalles fixes (Leitner, 1-3-7-14 jours) ou SM-2 : rejeté, FSRS modélise mieux l'oubli, est libre, éprouvé par Anki et se code en fonctions pures.
- Stocker l'état de mémoire de chaque Question et le mettre à jour à chaque réponse : rejeté, un état corrompu ou un changement de paramètres serait irrécupérable ; le journal suffit à le recalculer.
- Garder la Maîtrise comme moyenne des derniers scores avec une pénalité linéaire : rejeté, elle ne correspond pas à l'oubli réel et ne récompense pas la régularité.
- Une Leçon terminée qui sort des révisions : rejeté, c'est justement après le contrôle que l'oubli commence.
- Révisions par Leçon plutôt que mélangées : rejeté, l'entrelacement (Rohrer & Taylor 2007) apprend à reconnaître de quoi il s'agit.
- Paramètres FSRS optimisés pour chaque Élève : écarté pour l'instant, trop peu de réponses par Élève ; le journal permettra de le faire plus tard.
- Rappels hors de l'appli (notifications) : écarté, l'appli reste locale (ADR 0001).

## Consequences

- Une révision ne coûte plus rien en quota : seules les variantes passent par le prof, en arrière-plan, sur le Modèle le moins cher.
- La Maîtrise d'une Leçon baisse toute seule avec le temps, plus vite pour ce qui a été peu révisé ; deux calculs coexistent tant que d'anciennes Leçons sans Questions existent.
- Le planificateur se teste en fonctions pures avec une horloge injectée, sans serveur ni temps réel.
- La règle « deux succès espacés » de Retenu (ADR 0003) devient le cas des Leçons sans Questions.
- L'appli ne valide des variantes que la forme (QCM bien formé, énoncé nouveau, une bonne réponse) : qu'elles testent la même chose avec la même bonne réponse en sens est seulement demandé au prof. Une variante fausse sur le fond resterait ; elle partage la mémoire de la Question et sera oubliée si le prof réécrit la question d'origine.

## Mise à jour du 2026-10-15 : formats de rappel actif (spec #48)

Les formats où l'Élève répond en plusieurs éléments (texte à trous, ordre, associer, classer, exemple à étapes) et « réfléchis puis dévoile » (« à moitié ») donnent un crédit partiel. Une réponse juste en partie (des points, sans être entièrement juste) vaut « difficile », comme juste mais pas sûr : l'Élève en savait une part, la Question revient vite sans repartir de zéro. Faux sans aucun point ou « Je ne sais pas » vaut toujours « à revoir ». Le journal garde ces points (`points`) ; la règle de notation reste dans le module pur de la mémoire. Les variantes restent des QCM : seuls les QCM et leur cas particulier « choisis la meilleure explication » en reçoivent.

## Mise à jour du 2026-10-15 : une Question ratée compte 0 dans la Maîtrise

Juste après une réponse, la courbe d'oubli donne une probabilité de se souvenir de 100 %, quelle que soit la stabilité : un quiz raté à l'instant affichait une Leçon « 100 % acquis ». Une Question dont la dernière réponse est « à revoir » (fausse sans crédit partiel, ou « Je ne sais pas ») compte donc 0 dans la Maîtrise, jusqu'à une réponse juste ou juste en partie (quiz de page ou Révision du jour) ; elle suit ensuite la courbe d'oubli. La probabilité exposée par chaque Question (`rappel`) et le planificateur ne changent pas.

Options écartées : calculer la probabilité au moins un jour après la dernière réponse (une Question ratée vaudrait encore 79 % le lendemain, FSRS supposant la correction lue) ; compter 0 pour les Objectifs pas encore interrogés (mélange « ce que je sais » et « jusqu'où je suis allé », rejeté par l'ADR 0003).
