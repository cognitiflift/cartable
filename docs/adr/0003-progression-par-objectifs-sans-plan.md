# La progression d'une Leçon se mesure en Objectifs qui suivent la mission de `teach`, sans plan d'étapes ni fin pour une Leçon libre

Lors de l'essai réel (#9, #14), un Élève affichait « 100 % acquis » dès la première page : la Maîtrise, moyenne des derniers quiz, ne dit pas jusqu'où il est allé dans la Leçon. Le remède évident, un plan d'étapes fixé à l'avance (« étape 1/4 »), contredit le skill `teach`, qui choisit chaque page d'après la zone proximale de l'Élève et refuse que la mission devienne un plan. Nous avons donc ancré la progression sur les **Objectifs** : les « Success looks like » de `MISSION.md`, fixés dès la première Séance (tirés du Document source pour une Leçon de révision). Chaque quiz déclare les Objectifs qu'il couvre, et c'est l'appli qui les déclare atteints (score de 80 % ou plus), dans l'esprit de l'ADR 0002 : les règles restent fixées par l'appli, et le prof garde la liberté de l'ordre et du nombre de pages. Une Leçon libre affiche un **Niveau de Leçon** (Objectifs atteints + 1) sans maximum, et ne se termine jamais : comme dans `teach`, sa mission peut s'élargir, avec l'accord de l'Élève, ce qui ajoute des Objectifs. Seule la Leçon de révision a une fin (un Défi réussi) et des Étoiles.

Dans le même esprit, le **Dépassement** (un encart « Pour aller plus loin » et 2 ou 3 questions bonus) assouplit la consigne « page fidèle au document » des Leçons de révision, mais ses questions sont **hors score** : elles ne comptent ni dans le Rebond, ni dans la fin de la Leçon, ni dans la Maîtrise. Seule une Étoile les récompense. Un Élève qui sait tout le contenu de son contrôle n'est jamais pénalisé par ce qui le dépasse.

## Considered Options

- Plan d'étapes fixé à l'avance : rejeté, contraire à `teach` (pages choisies une à une).
- Plafonner la Maîtrise tant que peu de quiz sont faits : rejeté, mélange « ce que je sais » et « jusqu'où je suis allé ».
- Leçon libre terminée quand tous ses Objectifs sont atteints : rejeté, `teach` n'a pas de fin et sa mission évolue.
- Questions bonus comptées dans le score : rejeté, elles pourraient faire échouer un Élève qui maîtrise le programme.

## Objectif atteint, puis Retenu (mise à jour, spec #46)

Un Objectif était atteint pour toujours après un seul quiz réussi, souvent passé juste après avoir lu la page : un Élève a ainsi atteint ses Objectifs sur trois pages le même jour, à 100 %. C'est la réussite du moment (la fluence), pas une connaissance retenue. La règle d'atteinte ne change pas : un **Objectif atteint** (quiz réussi à 80 % ou plus) fait toujours monter le **Niveau de Leçon**, pour garder la même progression. Mais l'appli distingue désormais un second état : un Objectif est **Retenu** quand il est couvert par au moins deux quiz réussis (80 % ou plus) passés à **au moins 24 heures d'intervalle**, donc un autre jour. Les quiz faits en Révisant une Leçon libre, qui ne comptent pas pour l'atteinte, comptent pour Retenu ; le Pré-test ne compte ni pour l'un ni pour l'autre. Retenu est calculé à la lecture par une fonction pure, sur les entrées de score déjà stockées : aucune migration, et un Objectif Retenu le reste pour toujours. Il ne change ni le Niveau de Leçon ni la Maîtrise. Comme l'atteinte, cette règle est fixée par l'appli, pas par le prof.

Enfin, un Objectif couvert par une question réussie au **Pré-test** est exposé « à confirmer » : le prof peut l'aborder plus vite, mais il n'est pas atteint tant qu'un vrai quiz ne l'a pas confirmé.

### Considered Options

- Exiger le second succès un autre jour pour atteindre l'Objectif : rejeté, le Niveau de Leçon monterait plus lentement et l'Élève perdrait la récompense immédiate.
- Accepter deux succès le même jour pour Retenu : rejeté, ce serait encore de la fluence.
- Laisser le prof juger ce qui est Retenu : rejeté, contraire au principe des règles fixées par l'appli.
- Attendre la répétition espacée (vague suivante) : rejeté, Retenu en donne dès maintenant une version simple, que la répétition espacée affinera.
