# Cartable

Une interface locale très simple qui permet à des élèves d'apprendre avec un agent enseignant, en français.

## Language

**Élève**:
Personne qui apprend. Identifiée par son **Pseudo** ; aucun mot de passe.
_Avoid_: utilisateur, compte (sauf pour parler de la création d'un Élève)

**Pseudo**:
Nom choisi par l'Élève pour se reconnaître au démarrage.

**Profil**:
Âge (libre), **Niveau de scolarité**, nombre de Propositions (2 à 10, 4 par défaut), **Modèle** et **Lecture à voix haute** de l'Élève, définis à sa création et modifiables ensuite, utilisés pour adapter les Propositions de l'agent.

**Lecture à voix haute**:
Réglage du Profil, coupé par défaut : un bouton « 🔊 » lit le texte d'une Page de leçon et chaque question (du quiz ou des Révisions du jour) avec une voix de l'appareil, française si elle existe ; le même bouton arrête la lecture. Aucun texte ne sort de l'appareil.

**Modèle**:
Modèle de langage avec lequel l'agent écrit les Pages de leçon d'un Élève, choisi dans une liste fermée ; Sonnet par défaut pour un nouveau Profil (un Profil existant garde le sien). Les Propositions utilisent toujours Haiku, et un **Modèle de secours** le remplace quand il est surchargé ou indisponible (pas quand le quota est épuisé). Un changement vaut dès l'appel suivant, y compris dans une Leçon commencée.
_Avoid_: IA (trop vague : désigne aussi bien l'agent)

**Niveau de scolarité**:
Classe de l'Élève dans le système scolaire belge francophone, choisie dans une liste fermée (sauf précision contraire de l'Élève).
_Avoid_: niveau tout court (confusion avec Niveau de Leçon)

**Espace personnel**:
Dossier propre à un Élève, qui contient son Profil, toutes ses Leçons et ses Badges. Cloisonné : l'agent n'accède jamais à l'Espace personnel d'un autre Élève.

**Vue parent**:
Écran d'un Élève destiné au parent, ouvert depuis le Profil (jamais depuis l'accueil de l'Élève, sans mot de passe) : Révisions du jour et quiz faits ces 7 derniers jours, Objectifs Retenus, Objectifs fragiles (atteints mais pas encore Retenus), Questions fragiles (moins de 80 % de chances de s'en souvenir aujourd'hui), contrôles à venir avec leur préparation (Maîtrise, Questions dues), Badges récents et total d'Étoiles et de Fusées, Coût des Leçons. Agrégée par l'appli à partir des données existantes, sans tour de l'agent.

**Leçon**:
Unité d'apprentissage d'un Élève sur un sujet précis. Correspond à un workspace du skill `teach` (mission, leçons HTML, fiches, traces d'apprentissage). Appartient à une seule **Catégorie**.
_Avoid_: cours, chapitre

**Catégorie**:
Matière scolaire servant à classer les Leçons d'un Élève (français, sciences…).

**Leçon de révision**:
Leçon issue d'un **Document source** : l'agent propose à l'Élève de réviser puis évalue ses connaissances.

**Leçon libre**:
Leçon issue du souhait de l'Élève d'apprendre un sujet de son choix, ou d'une proposition de l'agent.

**Document source**:
PDF ou image (JPEG…) d'une leçon scolaire fournie par l'Élève : scan ou photo de cahier manuscrit, ou de page imprimée.

**Continuer**:
Retourner dans une Leçon déjà commencée, même terminée. Pour une Leçon libre, l'appli affiche le titre de la page que l'agent a annoncée pour la suite.
_Avoid_: reprendre

**Leçon terminée**:
Leçon de révision dont l'Élève a réussi un Défi (quiz du Défi à 80 % ou plus). Une Leçon libre ne se termine jamais : sa mission peut toujours s'élargir. Reste ouvrable : l'Élève peut la Continuer. Une Leçon terminée le reste pour toujours, mais ce n'est pas un arrêt : ses Questions continuent de revenir dans les Révisions du jour.

**Séance**:
Temps où l'Élève travaille une Leçon ouverte avec l'agent. Chaque Séance produit une Page de leçon, affichée en plein écran. L'Élève n'y écrit jamais : il répond seulement par des **Réponses proposées**, et ne peut pas interroger l'agent de lui-même.
_Avoid_: chat, conversation

**Page de leçon**:
Page HTML produite par une Séance, avec son contenu et son quiz. Une Leçon en compte plusieurs, choisies une à une par l'agent selon l'avancée de l'Élève (aucun plan fixé à l'avance).
_Avoid_: leçon (réservé à la Leçon entière)

**Objectif**:
Chose concrète que l'Élève saura faire au bout d'une Leçon. Les Objectifs sont fixés dès la première Séance (tirés du Document source pour une Leçon de révision), puis les pages s'enchaînent librement pour les atteindre. Ceux d'une Leçon libre suivent sa mission : ils s'allongent quand l'Élève accepte de l'élargir. Un Objectif est atteint quand l'Élève réussit (80 % ou plus) un quiz qui le couvre ; il fait alors monter le Niveau de Leçon. Atteint ne veut pas encore dire **Retenu**. Un Objectif couvert par une question réussie au Pré-test est **à confirmer** : il n'est pas atteint pour autant.

**Retenu**:
Objectif réussi au moins deux fois, dans des quiz réussis (80 % ou plus, hors Pré-test) passés à au moins 24 heures d'intervalle ; les quiz faits en Révisant comptent. Mesure ce qui tient dans le temps, alors qu'un Objectif atteint peut n'être qu'une réussite du moment, juste après avoir lu la page. Calculé par l'appli, acquis pour toujours, sans effet sur le Niveau de Leçon. Quand la Leçon a des Questions, il s'appuie sur leur mémoire : un Objectif atteint est Retenu quand toutes les Questions qui le couvrent ont une stabilité d'au moins 5 jours (en pratique, deux réponses justes à au moins un jour d'écart) ; il suit alors la mémoire et se perd si l'une d'elles est oubliée. Un Objectif qu'aucune Question ne couvre garde la règle des deux succès espacés. La carte de la Leçon affiche par exemple « 3 Objectifs · 1 Retenu ».
_Avoid_: acquis (palier de Maîtrise d'une Leçon dont tous les Objectifs sont Retenus), mémorisé, atteint (un Objectif atteint n'est pas forcément Retenu)

**À confirmer**:
État d'un Objectif couvert par une question réussie au Pré-test : l'Élève semble déjà le savoir, mais ce n'est ni atteint ni Retenu tant qu'un vrai quiz ne l'a pas confirmé. Sert au prof pour ne pas réenseigner ce que l'Élève sait.
_Avoid_: acquis, déjà su

**Cadrage**:
Questions posées au tout début d'une Leçon, avant la première Page de leçon, pour situer l'Élève. En deux temps : d'abord l'appli pose elle-même deux questions fixes, à réponses fermées et sans tour de l'agent, **Pourquoi ?** (curiosité, école, exposé ou projet, contrôle, pour en parler avec quelqu'un) et **Tu en sais déjà…** (rien, je découvre ; un peu ; beaucoup ; je suis incollable) ; puis, dans la première Séance, le prof pose deux questions propres au sujet avec des Réponses proposées, **À la fin, tu voudrais pouvoir…** et **Où as-tu croisé ce sujet ?** Pour une Leçon de révision, seule « Tu en sais déjà… » reste côté appli, et la question du prof devient « Qu'est-ce qui te semble le plus dur ? ». Chaque question accepte « Je ne sais pas ». Les réponses sont enregistrées dans la Leçon et servent aussi aux Propositions.
_Avoid_: questionnaire, diagnostic, mission (la mission est ce que le prof écrit après le Cadrage)

**Pré-test**:
Courte page « Devine ! » de trois questions que le prof crée à la fin du Cadrage, au niveau annoncé par « Tu en sais déjà… », sans contenu à enseigner (tirée du Document source pour une Leçon de révision). Son score est hors Maîtrise, hors Objectifs atteints, hors Étoiles et hors Rebond : après lui, l'appli propose un seul Rebond, « Commencer », qui transmet ses résultats au prof pour orienter la première vraie Page de leçon. Son Retour de quiz montre, avec bienveillance, l'écart entre ce que l'Élève pensait savoir et ce qu'il a trouvé.
_Avoid_: évaluation, test de niveau, examen

**Confiance**:
Ce que l'Élève indique après chaque réponse d'un quiz, avant de voir la correction : « sûr » ou « pas sûr ». Ne change jamais le score. Les erreurs commises « sûr » sont signalées au prof, qui les retravaille en priorité.
_Avoid_: certitude, assurance, auto-évaluation (réservé à « Tu en sais déjà… » du Cadrage)

**Dépassement**:
Ce qui va un tout petit peu au-delà du contenu d'une Leçon pour éveiller la curiosité de l'Élève : un encart « Pour aller plus loin » dans la Page de leçon et 2 ou 3 questions bonus dans son quiz. Pour une Leçon de révision, il est signalé comme hors du Document source. Distinct du **Défi**, qui reste sur le même contenu, en plus difficile. Il est **réussi** quand l'Élève réussit au moins 2 questions bonus sur 3 dans un même quiz ; il rapporte alors une Fusée.

**Réponse proposée**:
Réponse que l'agent soumet à l'Élève quand il lui pose une question (2 à 4 ; l'Élève choisit la plus proche), toujours complétée par « Je ne sais pas ». N'entre pas dans la Maîtrise.
_Avoid_: suggestion (confusion avec Proposition)

**Retour de quiz**:
Court message affiché aussitôt après un quiz de page, avec le **Rebond** : l'appli le compose elle-même à partir de phrases préparées (score, Étoiles, Fusées et Badges gagnés, ce qui est réussi), sans attendre l'agent. L'agent commente les questions ratées en tête de la Page de leçon suivante.

**Kit**:
Composants servis par l'appli elle-même à toute nouvelle Page de leçon : le quiz et le style de base (lisibilité, couleur de la Catégorie, mode sombre). L'agent n'y écrit que les questions, sous forme de données ; il garde la liberté d'ajouter à sa Leçon des composants propres au sujet.
_Avoid_: composants (seul : ambigu avec ceux de la Leçon), bibliothèque

**Coût d'un tour**:
Ce que consomme un appel à l'agent (tokens et coût indicatif), avec le type de tâche qui l'a demandé ; cumulé par Leçon et par Élève. Indicateur relatif : avec l'abonnement Pro, il se mesure en quota partagé, pas en argent dépensé.
_Avoid_: prix, facture

**Rebond**:
Ce que l'appli propose à l'Élève après un quiz, d'après le score de ce quiz (pas la Maîtrise) : pour une Leçon de révision (ou une Leçon qu'on Révise), **Revoir** sous 80 % (une page qui reprend autrement ce qui est raté), sinon **Défi** (une page plus difficile, dont la réussite termine la Leçon de révision) ; pour une Leçon libre, toujours **Étape suivante** (la page nouvelle que l'agent choisit selon la zone proximale de l'Élève, dans la même Leçon). Après le premier Pré-test d'une Leçon, seul **Commencer** est proposé : il transmet au prof les résultats du Pré-test pour la première vraie Page de leçon.
_Avoid_: suite (réservé aux Propositions), leçon suivante

**Page préparée**:
Page du Rebond le plus probable, que le prof prépare en arrière-plan pendant que l'Élève fait le quiz de la Page de leçon affichée : Étape suivante en Leçon libre, supposée réussie ; en révision, Défi si le dernier quiz est réussi, sinon Revoir. Si aucune ne s'est préparée pendant le quiz, elle se prépare après son Retour de quiz, pour le Rebond proposé, avec les résultats du quiz. Une seule à la fois, dans un dossier à part, jamais en même temps qu'un autre tour de la Leçon. Elle ne devient une Page de leçon, sans attendre, que si l'Élève choisit ce Rebond et que son quiz est réussi ou raté comme prévu ; sinon elle est écartée et le prof crée la page comme d'habitude. Son coût compte avec la Leçon, même écartée ; le taux de pages préparées inutilisées est suivi, et la préparation se suspend quand plus de la moitié des pages préparées des 14 derniers jours (6 au moins) sont restées inutilisées ; elle reprend quand elles sortent de ces 14 jours. Elle se coupe dans le Profil.

**Proposition**:
Sujet de nouvelle Leçon suggéré par l'agent, affiché dès l'écran « Nouvelle leçon ». Soit une **suite** de ce que l'Élève a déjà étudié, soit un sujet **original** adapté à son âge et son Niveau de scolarité. Indépendamment de ce type, une Proposition peut être **au programme** : rattachée au programme scolaire officiel du Niveau de scolarité de l'Élève (2 par lot). Le nombre de Propositions d'un lot (2 à 10, 4 par défaut) se règle dans le profil de l'Élève. « D'autres idées » demande un lot qui s'écarte, par la matière et par l'angle, des 10 derniers titres proposés.

**Maîtrise**:
Mesure de ce que l'Élève sait d'une Leçon entière (pas d'une seule Page de leçon), calculée en pourcentage et lue par l'Élève en quatre **paliers de Maîtrise**, des mots de mémoire : _à revoir_ (moins de 50 %, rouge doux), _à consolider_ (de 50 % à moins de 80 %, orange), _bien en tête_ (80 % ou plus, vert) et _acquis_ (« Acquis ✓ », vert marqué). « Acquis » est un mot de fin : la Leçon a au moins un Objectif, **tous** ses Objectifs sont Retenus et la Maîtrise est d'au moins 80 %. Une Leçon sans Objectifs plafonne à « bien en tête » ; des quiz réussis le jour même (Objectifs atteints, pas Retenus) aussi. Rien n'est stocké : une Leçon acquise puis oubliée, ou dont la mission s'élargit, redescend d'elle-même. Les deux modes de Leçon suivent la même règle. Affichée à côté de chaque Leçon (accueil, en-tête de la Séance) par le mot coloré, sans chiffre : le pourcentage reste en infobulle ; le prof, lui, reçoit le pourcentage et le mot. On dit « palier de Maîtrise », pour ne pas le confondre avec le Palier d'un Badge. C'est la probabilité moyenne que l'Élève se souvienne aujourd'hui des Questions de la Leçon : elle baisse avec le temps, vite au début puis de moins en moins vite à chaque révision réussie, et remonte quand il révise. Une Question dont la dernière réponse est fausse (ou « Je ne sais pas ») compte 0 jusqu'à ce qu'elle soit réussie, même en partie : juste après la correction, l'Élève s'en souviendrait sans pour autant la savoir. Une ancienne Leçon sans Questions garde l'ancien calcul (moyenne des trois derniers scores, moins une pénalité après trois semaines sans quiz).
_Avoid_: score, moyenne (la Maîtrise n'est plus une moyenne de quiz), non acquis (remplacé par « à revoir »), palier tout court (réservé aux Badges)

**Question**:
Question de quiz d'une Page de leçon, dans l'un des formats du Kit : QCM (dont « choisis la meilleure explication »), où l'Élève reconnaît la bonne réponse, ou format de **rappel actif** (texte à trous, remettre dans l'ordre, associer, classer, exemple à étapes, réfléchis puis dévoile), où il la retrouve lui-même. Un format à plusieurs éléments donne un **crédit partiel** : une réponse juste en partie compte pour sa part dans le score, mais n'est « juste » que si elle l'est entièrement. Gardée par l'appli dans la Banque de Questions de sa Leçon dès que son résultat arrive avec le score : énoncé, champs de son format (réponses et bonne réponse d'un QCM, phrase et mots d'un texte à trous…), explication, image éventuelle, Objectifs couverts et page d'origine. Identifiée de façon stable par sa Leçon, sa page et son identifiant dans la page. Porte un **état de mémoire** (stabilité, difficulté, dernière et prochaine révision, probabilité de s'en souvenir), calculé par l'appli à partir du journal de ses réponses (quiz de page et Révisions du jour), jamais fixé par le prof ; une réponse juste en partie la fait revenir vite, sans repartir de zéro. Après deux réponses, le prof écrit en arrière-plan à un QCM (y compris « choisis la meilleure explication », dont les variantes gardent le format) deux **variantes** (un seul tour à la fois par Élève, Modèle le moins cher ; un tour raté n'est retenté qu'une fois) : d'autres formulations qui testent la même chose et partagent son état de mémoire. L'appli écarte les variantes mal formées ; une Révision du jour sert au hasard la Question ou l'une de ses variantes. Une Question réécrite par le prof perd ses variantes.
_Avoid_: carte, flashcard, item

**Banque de Questions**:
Ensemble des Questions d'une Leçon. Les questions bonus du Dépassement et celles du Pré-test n'y entrent pas ; les anciennes Leçons (quiz d'avant le Kit) n'en ont pas.

**Révision du jour**:
Série courte (10 Questions au plus) de Questions dont la révision est due ou en retard, tirées de toutes les Leçons de l'Élève et mélangées, proposée sur l'accueil par la carte « Mes révisions du jour ». Servie tout de suite par l'appli, sans tour du prof ni token ; la correction et l'explication s'affichent après chaque réponse, avec la Confiance et « Je ne sais pas » comme dans un quiz de page. Les Questions d'une Leçon de révision dont le contrôle approche passent en premier. Menée jusqu'au bout (une réponse à chaque Question servie), elle rapporte une Étoile, quel que soit le score, au plus une par jour.
_Avoid_: Réviser (retravailler une Leçon avec le prof), séance de révision, répétition

**Objectif du jour**:
Petit but quotidien montré sur l'accueil : 5 réponses en Révision du jour ou une Page de leçon terminée (quiz fait, hors Pré-test), en jour local. Calculé par l'appli à partir de l'historique de l'Élève.
_Avoid_: Objectif tout court (un Objectif appartient à une Leçon), quota, devoir

**Jour travaillé**:
Jour local où l'Élève a enregistré au moins une réponse : quiz de page, Pré-test ou Révision du jour. Lire une page sans faire son quiz ne compte pas. Le calendrier de Mes badges le montre pâle, plein quand l'Objectif du jour est atteint, avec 🛡️ quand un Joker l'a couvert.

**Série de jours**:
Nombre de jours où l'Objectif du jour a été atteint, de suite. Aujourd'hui, pas encore atteint, ne la casse pas. Chaque semaine (du lundi au dimanche), l'Élève reçoit sans condition trois **Jokers**, qui ne se reportent pas sur la semaine suivante ; un Joker couvre tout seul un jour manqué. Une pause plus longue que les Jokers de la semaine fait repartir la série. Un **récapitulatif de la semaine** passée (Objectifs devenus Retenus, révisions, pages) s'affiche au premier retour de la semaine. Jamais de comparaison entre Élèves.
_Avoid_: série tout court (une Révision du jour est aussi une série de Questions), streak, classement

**Badge**:
Récompense au niveau de l'Élève (et non d'une Leçon), qui salue l'effort, les bonnes habitudes et ce qui reste en mémoire, presque jamais la performance. Chaque badge compte quelque chose dans tout l'historique de l'Élève (jours où l'Objectif du jour est atteint, Révisions du jour menées jusqu'au bout, Objectifs devenus Retenus, Questions ratées puis réussies un autre jour, Fusées, Étoiles, Leçons terminées, Catégories explorées) et monte de **Palier** en Palier ; quelques **badges surprise**, uniques, restent cachés jusqu'à leur obtention. Calculé par l'appli seule, après chaque quiz et chaque Révision du jour, et enregistré dans l'Espace personnel : acquis pour toujours, même si la Leçon qui l'a déclenché est supprimée ou l'Objectif oublié.
_Avoid_: trophée, succès, médaille

**Palier**:
Seuil d'un Badge : bronze, argent, or puis diamant. Un Palier atteint ne redescend jamais, même si le compte qui l'a fait atteindre baisse (un Objectif Retenu oublié).
_Avoid_: niveau (confusion avec Niveau de Leçon et Niveau de scolarité)

**Mes badges**:
Écran de l'Élève, ouvert depuis la carte de l'Objectif du jour sur l'accueil : un calendrier des Jours travaillés (toucher un jour montre ce qui a été fait et gagné, sans les scores) et la collection des Badges (obtenus avec leur date, à venir en grisé avec leur progression, surprise cachés). Un Badge reste marqué « Nouveau » tant que l'Élève n'a pas ouvert Mes badges depuis qu'il l'a gagné.

**Niveau de Leçon**:
Avancée de l'Élève dans une Leçon libre : nombre d'Objectifs atteints plus un (on commence au niveau 1). Sans maximum : quand tous les Objectifs actuels sont atteints, l'agent propose à l'Élève d'élargir la mission, ce qui ajoute des Objectifs. Ne mesure pas ce que l'Élève sait (c'est la Maîtrise) mais jusqu'où il est allé.
_Avoid_: niveau tout court (confusion avec Niveau de scolarité), étape

**Étoiles**:
Récompenses de l'effort, acquises pour toujours et indépendantes de la Maîtrise, gagnées de trois façons. Une Leçon de révision en a trois : une pour un quiz ordinaire réussi (80 % ou plus), une pour son premier Dépassement réussi, une pour un Défi réussi (la Leçon terminée). Une Leçon libre en rapporte une par Page de leçon dont le quiz est réussi (80 % ou plus), sans maximum. Une Révision du jour menée jusqu'au bout en rapporte une, au plus une par jour ; celle-ci appartient à l'Élève, pas à une Leçon. Jamais pour le Pré-test, ni pour Réviser une Leçon libre.

**Fusée**:
Récompense d'un Dépassement réussi (🚀), une au plus par Page de leçon, en Leçon libre comme en Leçon de révision, acquise pour toujours. Refaire le quiz d'une même page n'en rapporte pas une deuxième. Jamais pour le Pré-test, ni pour Réviser une Leçon libre (les nouvelles pages créées en Révisant une Leçon de révision en rapportent).
_Avoid_: rocket, bonus (désigne les questions du Dépassement)

**Réviser**:
Retravailler une Leçon comme une Leçon de révision (Revoir ou Défi selon le score), dans la même Leçon, avec le prof (à distinguer d'une Révision du jour, servie par l'appli seule). Sur une Leçon de révision terminée, c'est la seule suite proposée : elle repart du Document source et permet de gagner les Étoiles manquantes, ou de s'entraîner encore avant un contrôle. Sur une Leçon libre, elle n'est proposée que si la dernière Page de leçon date de plus d'une semaine : elle repart des pages déjà vues, ne rapporte rien et ne change ni les Objectifs ni le Niveau de Leçon (seulement la Maîtrise) ; après le Défi, l'Élève retrouve l'Étape suivante.

**Type de tâche**:
Ce que l'appli demande à l'agent à un tour donné, dans une liste fermée : **première Séance** (les tours d'une Leçon qui n'a pas encore de Page de leçon), **page** (une Séance suivante ; le Retour de quiz, composé par l'appli, n'est pas un tour de l'agent), **Rebond** (Étape suivante, Revoir, Défi, Réviser, Commencer), **Propositions** et **Variantes** (les variantes des Questions, écrites en arrière-plan). Le Coût d'un tour et le Modèle en dépendent.

**Relais**:
Fonctionnement des tours de l'agent dans une Leçon qui a déjà sa première Page de leçon : chacun démarre une **session neuve** et reçoit le **préambule de relais**, au lieu de reprendre la conversation précédente. Il allège le Coût d'un tour ; la première Séance, elle, reprend toujours sa session.
_Avoid_: reprise (c'est justement ce que le relais évite)

**Session neuve**:
Appel à l'agent qui ne reprend pas la conversation des tours précédents : l'agent n'en garde aucun souvenir et repart des fichiers de la Leçon (mission, traces d'apprentissage, notes, pages) et du préambule de relais.

**Préambule de relais**:
Texte que l'appli ajoute en tête de chaque tour en session neuve, invisible pour l'Élève : ce que l'appli sait de la Leçon (pages déjà créées, Objectifs atteints ou non, scores récents et Maîtrise, résultats du dernier quiz avec la demande d'un court encart sur ce qui a été raté, page annoncée pour la suite, question en attente). Les résultats du dernier quiz n'y figurent pas quand la consigne du Rebond les porte déjà.
