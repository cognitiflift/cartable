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
Modèle de langage avec lequel l'agent travaille pour un Élève (Séances comme Propositions), choisi dans une liste fermée ; Haiku par défaut. Un changement vaut dès l'appel suivant, y compris dans une Leçon commencée.
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
Chose concrète que l'Élève saura faire au bout d'une Leçon. Les Objectifs sont fixés dès la première Séance (tirés du Document source pour une Leçon de révision), puis les pages s'enchaînent librement pour les atteindre. Ceux d'une Leçon libre suivent sa mission : ils s'allongent quand l'Élève accepte de l'élargir. Un Objectif est atteint quand l'Élève réussit (80 % ou plus) un quiz qui le couvre.

**Dépassement**:
Ce qui va un tout petit peu au-delà du contenu d'une Leçon pour éveiller la curiosité de l'Élève : un encart « Pour aller plus loin » dans la Page de leçon et 2 ou 3 questions bonus dans son quiz. Pour une Leçon de révision, il est signalé comme hors du Document source. Distinct du **Défi**, qui reste sur le même contenu, en plus difficile.

**Réponse proposée**:
Réponse que l'agent soumet à l'Élève quand il lui pose une question (2 à 4 ; l'Élève choisit la plus proche), toujours complétée par « Je ne sais pas ». N'entre pas dans la Maîtrise.
_Avoid_: suggestion (confusion avec Proposition)

**Retour de quiz**:
Court commentaire de l'agent sur le score d'un quiz de page, affiché avec le **Rebond**.

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
