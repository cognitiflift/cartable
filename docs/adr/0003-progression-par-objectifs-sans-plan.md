# La progression d'une Leçon se mesure en Objectifs qui suivent la mission de `teach`, sans plan d'étapes ni fin pour une Leçon libre

Lors de l'essai réel (#9, #14), un Élève affichait « 100 % acquis » dès la première page : la Maîtrise, moyenne des derniers quiz, ne dit pas jusqu'où il est allé dans la Leçon. Le remède évident, un plan d'étapes fixé à l'avance (« étape 1/4 »), contredit le skill `teach`, qui choisit chaque page d'après la zone proximale de l'Élève et refuse que la mission devienne un plan. Nous avons donc ancré la progression sur les **Objectifs** : les « Success looks like » de `MISSION.md`, fixés dès la première Séance (tirés du Document source pour une Leçon de révision). Chaque quiz déclare les Objectifs qu'il couvre, et c'est l'appli qui les déclare atteints (score de 80 % ou plus), dans l'esprit de l'ADR 0002 : les règles restent fixées par l'appli, et le prof garde la liberté de l'ordre et du nombre de pages. Une Leçon libre affiche un **Niveau de Leçon** (Objectifs atteints + 1) sans maximum, et ne se termine jamais : comme dans `teach`, sa mission peut s'élargir, avec l'accord de l'Élève, ce qui ajoute des Objectifs. Seule la Leçon de révision a une fin (un Défi réussi) et des Étoiles.

Dans le même esprit, le **Dépassement** (un encart « Pour aller plus loin » et 2 ou 3 questions bonus) assouplit la consigne « page fidèle au document » des Leçons de révision, mais ses questions sont **hors score** : elles ne comptent ni dans le Rebond, ni dans la fin de la Leçon, ni dans la Maîtrise. Seule une Étoile les récompense. Un Élève qui sait tout le contenu de son contrôle n'est jamais pénalisé par ce qui le dépasse.

## Considered Options

- Plan d'étapes fixé à l'avance : rejeté, contraire à `teach` (pages choisies une à une).
- Plafonner la Maîtrise tant que peu de quiz sont faits : rejeté, mélange « ce que je sais » et « jusqu'où je suis allé ».
- Leçon libre terminée quand tous ses Objectifs sont atteints : rejeté, `teach` n'a pas de fin et sa mission évolue.
- Questions bonus comptées dans le score : rejeté, elles pourraient faire échouer un Élève qui maîtrise le programme.
