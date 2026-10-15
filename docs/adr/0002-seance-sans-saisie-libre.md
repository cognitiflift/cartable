# La Séance n'a pas de saisie libre : l'Élève répond en touchant les réponses proposées par le prof

Les Élèves sont des enfants : une conversation libre avec l'agent risquait de dériver hors de la Leçon. L'Élève ne tape donc plus rien pendant une Séance. Quand le prof pose une question, il termine son message par une ligne `CHOIX: a | b | c` (2 à 4 réponses) ; l'appli la retire du texte, l'enregistre sur le message et ajoute toujours « Je ne sais pas 🤷 ». Après un quiz, c'est l'appli qui choisit la suite d'après le score : pour une Leçon de révision, ou une Leçon qu'on Révise, Revoir sous 80 % et sinon Défi ; pour une Leçon libre, toujours Étape suivante, c'est-à-dire une page nouvelle de la même Leçon que le prof choisit selon la zone proximale de l'Élève (bouton « Prêt pour la suite ? »), sans Revoir, comme le skill `teach` le fait de lui-même. Un Défi réussi (80 % ou plus) termine une Leçon de révision : l'appli affiche alors ses Étoiles et propose Réviser, à la place de l'ancien « Nouveau défi ». Une Leçon libre ne se termine jamais (voir ADR 0003) ; elle propose Réviser seulement si sa dernière page date de plus d'une semaine. Ces règles sont fixées par l'appli, pas par le prof, qui ne fait que déclarer les Objectifs que couvre chaque quiz. L'écran transmet au serveur l'action choisie, une valeur fermée et jamais du texte : le serveur vérifie qu'elle fait partie de celles que le dernier Retour de quiz proposait, puis rédige lui-même la consigne du prof. En contrepartie, l'Élève ne peut plus poser de question au prof pendant la leçon, ni relire l'historique de la conversation, qui reste stocké mais n'est plus affiché.

## Retour de quiz instantané (mise à jour, spec #45)

À l'origine, chaque quiz déclenchait un tour du prof pour rédiger le Retour de quiz : deux ou trois phrases de commentaire, payées par une relecture de toute la conversation, pendant que l'Élève attendait. Le Retour de quiz n'est plus rédigé par le prof : l'appli l'affiche aussitôt, composé à partir de phrases préparées selon le score, les Étoiles gagnées et le Dépassement, et l'enregistre comme avant, si bien que les Rebonds proposés se calculent de la même façon. Le prof reçoit les résultats par question du dernier quiz (réponse choisie, bonne réponse, juste ou non) dans la consigne du Rebond : il commente les questions ratées **en tête de la Page de leçon suivante**, et Revoir reprend nommément ces questions. Pour une Leçon libre, le titre annoncé pour la suite est écrit par le prof au moment où il crée la page, et non plus dans son commentaire du score.

### Considered Options

- Garder un tour du prof pour le Retour de quiz, avec un Modèle léger : rejeté, l'Élève attend toujours et le prof ne voit le raté qu'en pourcentage.
- Ne plus afficher de Retour de quiz : rejeté, l'Élève perd l'encouragement immédiat et l'annonce de ses Étoiles.

## Cadrage posé par l'appli (mise à jour, spec #46)

Jusqu'ici, seul le prof posait des questions, et toujours dans un tour payé. Pour situer l'Élève dès le départ, l'appli pose désormais elle-même, dans l'écran « Nouvelle leçon » et avant tout tour du prof, deux questions fixes du **Cadrage** : « Pourquoi ? » et « Tu en sais déjà… » (seulement la seconde pour une Leçon de révision). Leurs réponses sont **fermées**, comme les actions de Rebond : l'écran envoie des valeurs d'une liste fixée par l'appli, jamais du texte, et le serveur refuse toute valeur inconnue. « Je ne sais pas » est toujours possible, et le Cadrage peut être absent. L'appli enregistre ces réponses dans la Leçon et les transmet au prof, sous forme de libellés, dans le premier prompt. Le prof pose ensuite, comme toute question, avec une ligne `CHOIX`, ses deux questions propres au sujet, puis crée le Pré-test. Le principe de cet ADR ne change pas : l'Élève n'écrit toujours rien, et ces questions fixes ne coûtent aucun token.

Dans le même esprit, la **Confiance** (« sûr » ou « pas sûr », après chaque réponse d'un quiz et avant la correction) est un choix à deux boutons dans le quiz du Kit, sans effet sur le score.

### Considered Options

- Laisser le prof poser toutes les questions du Cadrage : rejeté, l'Élève attendrait un tour pour des questions qui ne dépendent pas du sujet, et le nombre de questions resterait au hasard du prof.
- Faire écrire à l'Élève ce qu'il sait déjà : rejeté, contraire à cet ADR (aucune saisie libre).
