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
Continuer une Leçon déjà commencée.

**Proposition**:
Sujet de nouvelle Leçon suggéré par l'agent, affiché dès l'écran « Nouvelle leçon ». Soit une **suite** de ce que l'Élève a déjà étudié, soit un sujet **original** adapté à son âge et son Niveau de scolarité.

**Maîtrise**:
Mesure de ce que l'Élève sait d'une Leçon, exprimée en pourcentage et en trois paliers : _non acquis_, _à consolider_, _acquis_. Affichée à côté de chaque Leçon.
