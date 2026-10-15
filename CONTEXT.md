# Cartable

Une interface locale très simple qui permet à des élèves d'apprendre avec un agent enseignant, en français.

## Language

**Élève**:
Personne qui apprend. Identifiée par son **Pseudo** ; aucun mot de passe.
_Avoid_: utilisateur, compte (sauf pour parler de la création d'un Élève)

**Pseudo**:
Nom choisi par l'Élève pour se reconnaître au démarrage.

**Profil**:
Âge (libre), **Niveau de scolarité**, nombre de Propositions (2 à 10, 4 par défaut) et **Modèle** de l'Élève, définis à sa création et modifiables ensuite, utilisés pour adapter les Propositions de l'agent.

**Modèle**:
Modèle de langage avec lequel l'agent écrit les Pages de leçon d'un Élève, choisi dans une liste fermée ; Sonnet par défaut pour un nouveau Profil (un Profil existant garde le sien). Les Propositions utilisent toujours Haiku, et un **Modèle de secours** le remplace quand il est surchargé ou indisponible (pas quand le quota est épuisé). Un changement vaut dès l'appel suivant, y compris dans une Leçon commencée.
_Avoid_: IA (trop vague : désigne aussi bien l'agent)

**Niveau de scolarité**:
Classe de l'Élève dans le système scolaire belge francophone, choisie dans une liste fermée (sauf précision contraire de l'Élève).
_Avoid_: niveau tout court (confusion avec Niveau de Leçon)

**Espace personnel**:
Dossier propre à un Élève, qui contient son Profil et toutes ses Leçons. Cloisonné : l'agent n'accède jamais à l'Espace personnel d'un autre Élève.

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
Leçon de révision dont l'Élève a réussi un Défi (quiz du Défi à 80 % ou plus). Une Leçon libre ne se termine jamais : sa mission peut toujours s'élargir. Reste ouvrable : l'Élève peut la Continuer. Une Leçon terminée le reste pour toujours.

**Séance**:
Temps où l'Élève travaille une Leçon ouverte avec l'agent. Chaque Séance produit une Page de leçon, affichée en plein écran. L'Élève n'y écrit jamais : il répond seulement par des **Réponses proposées**, et ne peut pas interroger l'agent de lui-même.
_Avoid_: chat, conversation

**Page de leçon**:
Page HTML produite par une Séance, avec son contenu et son quiz. Une Leçon en compte plusieurs, choisies une à une par l'agent selon l'avancée de l'Élève (aucun plan fixé à l'avance).
_Avoid_: leçon (réservé à la Leçon entière)

**Objectif**:
Chose concrète que l'Élève saura faire au bout d'une Leçon. Les Objectifs sont fixés dès la première Séance (tirés du Document source pour une Leçon de révision), puis les pages s'enchaînent librement pour les atteindre. Ceux d'une Leçon libre suivent sa mission : ils s'allongent quand l'Élève accepte de l'élargir. Un Objectif est atteint quand l'Élève réussit (80 % ou plus) un quiz qui le couvre ; il fait alors monter le Niveau de Leçon. Atteint ne veut pas encore dire **Retenu**. Un Objectif couvert par une question réussie au Pré-test est **à confirmer** : il n'est pas atteint pour autant.

**Retenu**:
Objectif réussi au moins deux fois, dans des quiz réussis (80 % ou plus, hors Pré-test) passés à au moins 24 heures d'intervalle ; les quiz faits en Révisant comptent. Mesure ce qui tient dans le temps, alors qu'un Objectif atteint peut n'être qu'une réussite du moment, juste après avoir lu la page. Calculé par l'appli, acquis pour toujours, sans effet sur le Niveau de Leçon. La carte de la Leçon affiche par exemple « 3 Objectifs · 1 Retenu ».
_Avoid_: acquis (palier de la Maîtrise), mémorisé, atteint (un Objectif atteint n'est pas forcément Retenu)

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
Ce qui va un tout petit peu au-delà du contenu d'une Leçon pour éveiller la curiosité de l'Élève : un encart « Pour aller plus loin » dans la Page de leçon et 2 ou 3 questions bonus dans son quiz. Pour une Leçon de révision, il est signalé comme hors du Document source. Distinct du **Défi**, qui reste sur le même contenu, en plus difficile.

**Réponse proposée**:
Réponse que l'agent soumet à l'Élève quand il lui pose une question (2 à 4 ; l'Élève choisit la plus proche), toujours complétée par « Je ne sais pas ». N'entre pas dans la Maîtrise.
_Avoid_: suggestion (confusion avec Proposition)

**Retour de quiz**:
Court message affiché aussitôt après un quiz de page, avec le **Rebond** : l'appli le compose elle-même à partir de phrases préparées (score, Étoiles gagnées, ce qui est réussi), sans attendre l'agent. L'agent commente les questions ratées en tête de la Page de leçon suivante.

**Confiance**:
Ce que l'Élève indique après avoir choisi une réponse d'un quiz, avant la correction : « sûr » ou « pas sûr ». Elle accompagne chaque résultat par question mais ne change jamais le score. Les erreurs commises « sûr » sont signalées à l'agent, qui les retravaille en priorité.

**Kit**:
Composants servis par l'appli elle-même à toute nouvelle Page de leçon : le quiz et le style de base (lisibilité, couleur de la Catégorie, mode sombre). L'agent n'y écrit que les questions, sous forme de données ; il garde la liberté d'ajouter à sa Leçon des composants propres au sujet.
_Avoid_: composants (seul : ambigu avec ceux de la Leçon), bibliothèque

**Coût d'un tour**:
Ce que consomme un appel à l'agent (tokens et coût indicatif), avec le type de tâche qui l'a demandé ; cumulé par Leçon et par Élève. Indicateur relatif : avec l'abonnement Pro, il se mesure en quota partagé, pas en argent dépensé.
_Avoid_: prix, facture

**Rebond**:
Ce que l'appli propose à l'Élève après un quiz, d'après le score de ce quiz (pas la Maîtrise) : pour une Leçon de révision (ou une Leçon qu'on Révise), **Revoir** sous 80 % (une page qui reprend autrement ce qui est raté), sinon **Défi** (une page plus difficile, dont la réussite termine la Leçon de révision) ; pour une Leçon libre, toujours **Étape suivante** (la page nouvelle que l'agent choisit selon la zone proximale de l'Élève, dans la même Leçon).
_Avoid_: suite (réservé aux Propositions), leçon suivante

**Proposition**:
Sujet de nouvelle Leçon suggéré par l'agent, affiché dès l'écran « Nouvelle leçon ». Soit une **suite** de ce que l'Élève a déjà étudié, soit un sujet **original** adapté à son âge et son Niveau de scolarité. Indépendamment de ce type, une Proposition peut être **au programme** : rattachée au programme scolaire officiel du Niveau de scolarité de l'Élève (2 par lot). Le nombre de Propositions d'un lot (2 à 10, 4 par défaut) se règle dans le profil de l'Élève. « D'autres idées » demande un lot qui s'écarte, par la matière et par l'angle, des 10 derniers titres proposés.

**Maîtrise**:
Mesure de ce que l'Élève sait d'une Leçon entière (pas d'une seule Page de leçon), exprimée en pourcentage et en trois paliers : _non acquis_, _à consolider_, _acquis_. Affichée à côté de chaque Leçon.

**Niveau de Leçon**:
Avancée de l'Élève dans une Leçon libre : nombre d'Objectifs atteints plus un (on commence au niveau 1). Sans maximum : quand tous les Objectifs actuels sont atteints, l'agent propose à l'Élève d'élargir la mission, ce qui ajoute des Objectifs. Ne mesure pas ce que l'Élève sait (c'est la Maîtrise) mais jusqu'où il est allé.
_Avoid_: niveau tout court (confusion avec Niveau de scolarité), étape

**Étoiles**:
Récompenses d'une Leçon de révision, au nombre de trois, acquises pour toujours : une pour un quiz ordinaire réussi (80 % ou plus), une pour 2 questions bonus du Dépassement réussies sur 3 dans un même quiz, une pour un Défi réussi (la Leçon terminée). Ne dépendent pas de la Maîtrise. Une Leçon libre n'a pas d'Étoiles : sa récompense est son Niveau de Leçon.

**Réviser**:
Retravailler une Leçon comme une Leçon de révision (Revoir ou Défi selon le score), dans la même Leçon. Sur une Leçon de révision terminée, c'est la seule suite proposée : elle repart du Document source et permet de gagner les Étoiles manquantes, ou de s'entraîner encore avant un contrôle. Sur une Leçon libre, elle n'est proposée que si la dernière Page de leçon date de plus d'une semaine : elle repart des pages déjà vues, ne rapporte rien et ne change ni les Objectifs ni le Niveau de Leçon (seulement la Maîtrise) ; après le Défi, l'Élève retrouve l'Étape suivante.

**Type de tâche**:
Ce que l'appli demande à l'agent à un tour donné, dans une liste fermée : **première Séance** (les tours d'une Leçon qui n'a pas encore de Page de leçon), **page** (une Séance suivante ; le Retour de quiz, composé par l'appli, n'est pas un tour de l'agent), **Rebond** (Étape suivante, Revoir, Défi, Réviser) et **Propositions**. Le Coût d'un tour et le Modèle en dépendent.

**Relais**:
Fonctionnement des tours de l'agent dans une Leçon qui a déjà sa première Page de leçon : chacun démarre une **session neuve** et reçoit le **préambule de relais**, au lieu de reprendre la conversation précédente. Il allège le Coût d'un tour ; la première Séance, elle, reprend toujours sa session.
_Avoid_: reprise (c'est justement ce que le relais évite)

**Session neuve**:
Appel à l'agent qui ne reprend pas la conversation des tours précédents : l'agent n'en garde aucun souvenir et repart des fichiers de la Leçon (mission, traces d'apprentissage, notes, pages) et du préambule de relais.

**Préambule de relais**:
Texte que l'appli ajoute en tête de chaque tour en session neuve, invisible pour l'Élève : ce que l'appli sait de la Leçon (pages déjà créées, Objectifs atteints ou non, scores récents et Maîtrise, résultats du dernier quiz avec la demande d'un court encart sur ce qui a été raté, page annoncée pour la suite, question en attente). Les résultats du dernier quiz n'y figurent pas quand la consigne du Rebond les porte déjà.
