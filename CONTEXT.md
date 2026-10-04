# Cartable

Une interface locale très simple qui permet à des élèves d'apprendre avec un agent enseignant, en français.

## Language

**Élève**:
Personne qui apprend. Identifiée par son **Pseudo** ; aucun mot de passe.
_Avoid_: utilisateur, compte (sauf pour parler de la création d'un Élève)

**Pseudo**:
Nom choisi par l'Élève pour se reconnaître au démarrage.

**Profil**:
Âge (libre) et **Niveau de scolarité** de l'Élève, définis à sa création, utilisés pour adapter les propositions de l'agent.

**Niveau de scolarité**:
Classe de l'Élève dans le système scolaire belge francophone, choisie dans une liste fermée (sauf précision contraire de l'Élève).

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

**Reprendre**:
Continuer une Leçon déjà commencée, même terminée.

**Leçon terminée**:
Leçon de révision dont l'Élève a réussi un Défi (quiz du Défi à 80 % ou plus). Reste ouvrable : l'Élève peut la Reprendre, par exemple pour un nouveau Défi avant son contrôle.

**Séance**:
Temps où l'Élève travaille une Leçon ouverte avec l'agent. Chaque Séance produit une page de leçon, affichée en plein écran. L'Élève n'y écrit jamais : il répond seulement par des **Réponses proposées**, et ne peut pas interroger l'agent de lui-même.
_Avoid_: chat, conversation

**Réponse proposée**:
Réponse que l'agent soumet à l'Élève quand il lui pose une question (2 à 4 ; l'Élève choisit la plus proche), toujours complétée par « Je ne sais pas ». N'entre pas dans la Maîtrise.
_Avoid_: suggestion (confusion avec Proposition)

**Retour de quiz**:
Court commentaire de l'agent sur le score d'un quiz de page, affiché avec le **Rebond**.

**Rebond**:
Ce que l'appli propose à l'Élève après un quiz, d'après le score de ce quiz (pas la Maîtrise) : **Revoir** sous 80 % (une page qui reprend autrement ce qui est raté) ; sinon **Défi** pour une Leçon de révision (une page plus difficile, dont la réussite termine la Leçon) ou **Étape suivante** pour une Leçon libre (la page suivante de la même Leçon).
_Avoid_: suite (réservé aux Propositions), leçon suivante

**Proposition**:
Sujet de nouvelle Leçon suggéré par l'agent, affiché dès l'écran « Nouvelle leçon ». Soit une **suite** de ce que l'Élève a déjà étudié, soit un sujet **original** adapté à son âge et son Niveau de scolarité.

**Maîtrise**:
Mesure de ce que l'Élève sait d'une Leçon, exprimée en pourcentage et en trois paliers : _non acquis_, _à consolider_, _acquis_. Affichée à côté de chaque Leçon.
