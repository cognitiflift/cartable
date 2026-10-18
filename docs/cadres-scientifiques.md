# Cadres scientifiques

Registre des cadres scientifiques que Cartable invoque ou applique, pour ses décisions d'apprentissage (quiz, mémoire, progression, récompenses, consignes du prof) et d'ergonomie (interface, lecture, accessibilité). La règle qui l'impose est la section « Fondement scientifique » d'`AGENTS.md`.

Chaque entrée donne ce que dit l'effet, sa référence (avec DOI ou lien stable quand il existe), sa solidité et les endroits du projet où il s'applique. Les termes en gras sont ceux du glossaire (`CONTEXT.md`).

Échelle de solidité :

- **Méta-analyse ou consensus** : effet établi sur de nombreuses études, ou norme publiée.
- **Étude isolée** : une étude ou quelques-unes, sans synthèse quantitative.
- **Heuristique tirée d'un cadre** : le cadre existe, mais la règle de Cartable en est une transposition, non mesurée telle quelle.

Ajouter un cadre : une nouvelle entrée, au même format, avec une référence vérifiée (auteurs, année, titre, revue ou éditeur). En cas de doute sur une référence, ne pas l'écrire : la décision va dans « Décisions sans fondement écrit ».

## Apprentissage et mémoire

### Effet du test et rappel actif

**Ce qu'il dit.** Se tester sur une matière la fait mieux retenir à long terme que la relire, même sans retour. Retrouver soi-même une réponse (rappel, production) retient mieux que la reconnaître parmi d'autres, surtout quand une correction suit ; la correction réduit aussi ce qu'un QCM peut faire retenir de faux, et un nouveau test sur l'erreur corrigée la fait retenir. L'effet profite surtout à ce qui a été testé : il se transfère peu à ce qui ne l'a pas été.

**Référence.**
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science*, 17(3), 249–255. doi:[10.1111/j.1467-9280.2006.01693.x](https://doi.org/10.1111/j.1467-9280.2006.01693.x)
- Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research*, 87(3), 659–701. doi:[10.3102/0034654316689306](https://doi.org/10.3102/0034654316689306)
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology. *Psychological Science in the Public Interest*, 14(1), 4–58. doi:[10.1177/1529100612453266](https://doi.org/10.1177/1529100612453266)
- Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. *Science*, 331(6018), 772–775. doi:[10.1126/science.1199327](https://doi.org/10.1126/science.1199327)
- Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. *Journal of Experimental Psychology: Human Learning and Memory*, 4(6), 592–604. doi:[10.1037/0278-7393.4.6.592](https://doi.org/10.1037/0278-7393.4.6.592)
- Kang, S. H. K., McDermott, K. B., & Roediger, H. L. (2007). Test format and corrective feedback modify the effect of testing on long-term retention. *European Journal of Cognitive Psychology*, 19(4–5), 528–558. doi:[10.1080/09541440601056620](https://doi.org/10.1080/09541440601056620)
- Butler, A. C., & Roediger, H. L. (2008). Feedback enhances the positive effects and reduces the negative effects of multiple-choice testing. *Memory & Cognition*, 36(3), 604–616. doi:[10.3758/MC.36.3.604](https://doi.org/10.3758/MC.36.3.604)
- Pashler, H., Cepeda, N. J., Wixted, J. T., & Rohrer, D. (2005). When does feedback facilitate learning of words? *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 31(1), 3–8. doi:[10.1037/0278-7393.31.1.3](https://doi.org/10.1037/0278-7393.31.1.3)
- Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning: Meta-analytic review and synthesis. *Psychological Bulletin*, 144(7), 710–756. doi:[10.1037/bul0000151](https://doi.org/10.1037/bul0000151)

**Solidité.** Méta-analyse ou consensus pour l'effet du test (Adesope et al. 2017 ; « utilité élevée » chez Dunlosky et al. 2013) et pour la correction après la réponse. Méta-analyse ou consensus pour le faible transfert à ce qui n'a pas été testé (Pan & Rickard 2018). Étude isolée pour la supériorité du rappel sur la reconnaissance selon le format (Kang et al. 2007). Heuristique tirée d'un cadre pour les formats de **rappel actif** de Cartable : l'Élève y retrouve la réponse, mais en touchant des éléments donnés (mots à placer parmi des intrus, ordre, association), ce qui les rapproche de la reconnaissance ; seul « réfléchis puis dévoile » est un rappel sans indice, noté par l'Élève lui-même. Leur supériorité sur le QCM n'est pas mesurée.

**Où dans Cartable.** Le quiz de chaque **Page de leçon** ; les formats de **rappel actif** de la **Question** et la consigne « au moins une question de rappel actif par quiz » (`lib/agent.js`, `public/kit/v1/LISEZMOI.md`) ; une question comptée par idée-clé de la page, chaque Objectif du quiz couvert, et en **Revoir** une question reformulée par question ratée (consigne « Nombre de questions » et Rebonds, `lib/agent.js`, ticket #128) ; la correction et l'explication après chaque réponse dans les **Révisions du jour** ; ADR 0006 ; le champ `figure` d'une question réservé aux questions qui demandent de lire ou d'interpréter le visuel, pas aux questions de rappel dont la réponse y est écrite, que le visuel remontré donnerait à recopier (heuristique tirée d'un cadre, consigne « Visuels » et LISEZMOI, ticket #134).

### Espacement et réapprentissage espacé

**Ce qu'il dit.** À temps d'étude égal, répartir les révisions dans le temps retient bien mieux que les grouper ; l'intervalle utile grandit avec le délai de rétention visé. On oublie vite au début, puis de moins en moins vite. Le réapprentissage espacé (retrouver plusieurs fois la même réponse, au fil de sessions séparées) donne une rétention durable pour un coût modeste.

**Référence.**
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380. doi:[10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354)
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102. doi:[10.1111/j.1467-9280.2008.02209.x](https://doi.org/10.1111/j.1467-9280.2008.02209.x)
- Dunlosky et al. (2013), ci-dessus.
- Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and efficient learning: How much is enough? *Journal of Experimental Psychology: General*, 140(3), 283–302. doi:[10.1037/a0023956](https://doi.org/10.1037/a0023956)
- Rawson, K. A., Dunlosky, J., & Sciartelli, S. M. (2013). The power of successive relearning: Improving performance on course exams and long-term retention. *Educational Psychology Review*, 25(4), 523–548. doi:[10.1007/s10648-013-9240-4](https://doi.org/10.1007/s10648-013-9240-4)
- Murre, J. M. J., & Dros, J. (2015). Replication and analysis of Ebbinghaus' forgetting curve. *PLOS ONE*, 10(7), e0120644. doi:[10.1371/journal.pone.0120644](https://doi.org/10.1371/journal.pone.0120644)

**Solidité.** Méta-analyse ou consensus pour l'espacement (Cepeda et al. 2006). Étude isolée pour la forme de la courbe d'oubli telle que citée ici : Murre & Dros (2015) répliquent Ebbinghaus sur un seul sujet, mais le résultat est classique. Étude isolée (quelques expériences du même groupe) pour le réapprentissage espacé.

**Où dans Cartable.** **Révision du jour**, état de mémoire de la **Question**, **Maîtrise** qui baisse avec le temps, **Retenu** (stabilité d'au moins 5 jours des Questions qui couvrent l'Objectif, ou, sans Question, deux succès à au moins 24 heures d'écart), **Leçon terminée** qui continue d'être révisée ; ADR 0003 (mise à jour spec #46) et ADR 0006. Une idée n'est pas interrogée deux fois sur la même **Page de leçon** : les Révisions du jour la reposent, espacée (consigne « Nombre de questions », `lib/agent.js`, ticket #128).

### Entrelacement

**Ce qu'il dit.** Mélanger des problèmes de types différents dans une même série, au lieu de les enchaîner par blocs, apprend à reconnaître quelle méthode s'applique. L'effet dépend de la ressemblance des catégories : il est net quand elles se confondent facilement, faible ou nul sinon.

**Référence.**
- Rohrer, D., & Taylor, K. (2007). The shuffling of mathematics problems improves learning. *Instructional Science*, 35(6), 481–498. doi:[10.1007/s11251-007-9015-8](https://doi.org/10.1007/s11251-007-9015-8)
- Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved practice improves mathematics learning. *Journal of Educational Psychology*, 107(3), 900–908. doi:[10.1037/edu0000001](https://doi.org/10.1037/edu0000001)
- Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin*, 145(11), 1029–1052. doi:[10.1037/bul0000209](https://doi.org/10.1037/bul0000209)

**Solidité.** Méta-analyse ou consensus pour des catégories proches (exercices de mathématiques, peintres, espèces). Heuristique tirée d'un cadre pour le mélange des **Révisions du jour** entre Leçons de matières différentes : la méta-analyse ne montre pas de bénéfice net quand les catégories sont très distinctes (voir « Écarts relevés »).

**Où dans Cartable.** Consigne de mathématiques du prof, « exercices de types mélangés » (`lib/agent.js`, `public/kit/v1/LISEZMOI.md`) ; Questions mélangées entre Leçons des **Révisions du jour** (ADR 0006).

### Exemples résolus et retrait progressif

**Ce qu'il dit.** Pour une méthode nouvelle, étudier des exemples entièrement résolus apprend mieux, au début, que résoudre seul des problèmes. Retirer ensuite les étapes une à une (« fading ») fait passer en douceur de l'exemple à la résolution autonome. L'avantage s'inverse quand l'Élève maîtrise déjà la méthode (effet d'inversion dû à l'expertise).

**Référence.**
- Sweller, J., & Cooper, G. A. (1985). The use of worked examples as a substitute for problem solving in learning algebra. *Cognition and Instruction*, 2(1), 59–89. doi:[10.1207/s1532690xci0201_3](https://doi.org/10.1207/s1532690xci0201_3)
- Atkinson, R. K., Derry, S. J., Renkl, A., & Wortham, D. (2000). Learning from examples: Instructional principles from the worked examples research. *Review of Educational Research*, 70(2), 181–214. doi:[10.3102/00346543070002181](https://doi.org/10.3102/00346543070002181)
- Renkl, A., Atkinson, R. K., Maier, U. H., & Staley, R. (2002). From example study to problem solving: Smooth transitions help learning. *The Journal of Experimental Education*, 70(4), 293–315. doi:[10.1080/00220970209599510](https://doi.org/10.1080/00220970209599510)
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. *Educational Psychologist*, 38(1), 23–31. doi:[10.1207/S15326985EP3801_4](https://doi.org/10.1207/S15326985EP3801_4)

**Solidité.** Méta-analyse ou consensus pour l'effet des exemples résolus (revue d'Atkinson et al. 2000, nombreuses réplications). Étude isolée pour le retrait progressif (quelques expériences de Renkl et collègues).

**Où dans Cartable.** Consigne de mathématiques du prof (`lib/agent.js`, commentaire « Sweller, Renkl ») et format « exemple à étapes » du Kit (`public/kit/v1/LISEZMOI.md`) ; spec #48, ticket #73.

### Effet du pré-test

**Ce qu'il dit.** Essayer de répondre avant d'avoir appris, même en se trompant, fait mieux apprendre ensuite ce qui a été demandé. L'effet sur le reste de la matière, non pré-testé, est moins régulier.

**Référence.**
- Richland, L. E., Kornell, N., & Kao, L. S. (2009). The pretesting effect: Do unsuccessful retrieval attempts enhance learning? *Journal of Experimental Psychology: Applied*, 15(3), 243–257. doi:[10.1037/a0016496](https://doi.org/10.1037/a0016496)
- Kornell, N., Hays, M. J., & Bjork, R. A. (2009). Unsuccessful retrieval attempts enhance subsequent learning. *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 35(4), 989–998. doi:[10.1037/a0015729](https://doi.org/10.1037/a0015729)
- Pan, S. C., & Carpenter, S. K. (2023). Prequestioning and pretesting effects: A review of empirical research, theoretical perspectives, and implications for educational practice. *Educational Psychology Review*, 35(4), article 97. doi:[10.1007/s10648-023-09814-5](https://doi.org/10.1007/s10648-023-09814-5)

**Solidité.** Méta-analyse ou consensus (revue de Pan & Carpenter 2023) pour l'information pré-testée ; plus fragile pour l'information non pré-testée.

**Où dans Cartable.** **Pré-test** « Devine ! » et l'état **À confirmer** (`lib/pretest.js`, `consignePremierTour` dans `lib/agent.js`) ; ADR 0002 (Cadrage) et ADR 0003.

### FSRS

**Ce qu'il dit.** FSRS (Free Spaced Repetition Scheduler) modélise la mémoire de chaque élément par sa stabilité, sa difficulté et sa probabilité de rappel, et planifie la révision suivante pour une rétention visée. Ses paramètres par défaut sont ajustés sur un grand nombre de journaux de révision d'Anki.

**Référence.**
- Ye, J., Su, J., & Cao, Y. (2022). A stochastic shortest path algorithm for optimizing spaced repetition scheduling. *Proceedings of the 28th ACM SIGKDD Conference on Knowledge Discovery and Data Mining*, 4381–4390. doi:[10.1145/3534678.3539081](https://doi.org/10.1145/3534678.3539081)
- Su, J., Ye, J., Nie, L., Cao, Y., & Chen, Y. (2023). Optimizing spaced repetition schedule by capturing the dynamics of memory. *IEEE Transactions on Knowledge and Data Engineering*, 35(10), 10085–10097. doi:[10.1109/TKDE.2023.3251721](https://doi.org/10.1109/TKDE.2023.3251721)
- Description de l'algorithme : [open-spaced-repetition/fsrs4anki, « The Algorithm »](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) ; comparaison avec d'autres planificateurs : [open-spaced-repetition/srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark).

**Solidité.** Étude isolée : FSRS prédit mieux le rappel que SM-2 et d'autres planificateurs sur des journaux d'Anki, mais c'est une validation de prédiction, pas une étude contrôlée de ce que les élèves apprennent. Il repose sur l'effet du test et l'espacement, eux bien établis. Sa rétention visée de 90 % est la valeur par défaut, pas un optimum démontré.

**Où dans Cartable.** État de mémoire de la **Question**, **Maîtrise**, **Retenu**, **Révision du jour** (`lib/memoire.js`, FSRS-5 avec ses paramètres par défaut) ; ADR 0006.

### Métacognition et Confiance

**Ce qu'il dit.** Les élèves jugent mal ce qu'ils savent : une réussite juste après la lecture (fluence) donne l'illusion d'avoir retenu. Les erreurs commises avec une grande confiance, une fois corrigées, sont mieux corrigées que les autres (hypercorrection).

**Référence.**
- Koriat, A., & Bjork, R. A. (2005). Illusions of competence in monitoring one's knowledge during study. *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 31(2), 187–194. doi:[10.1037/0278-7393.31.2.187](https://doi.org/10.1037/0278-7393.31.2.187)
- Bjork, R. A., Dunlosky, J., & Kornell, N. (2013). Self-regulated learning: Beliefs, techniques, and illusions. *Annual Review of Psychology*, 64, 417–444. doi:[10.1146/annurev-psych-113011-143823](https://doi.org/10.1146/annurev-psych-113011-143823)
- Butterfield, B., & Metcalfe, J. (2001). Errors committed with high confidence are hypercorrected. *Journal of Experimental Psychology: Learning, Memory, and Cognition*, 27(6), 1491–1494. doi:[10.1037/0278-7393.27.6.1491](https://doi.org/10.1037/0278-7393.27.6.1491)
- Metcalfe, J. (2017). Learning from errors. *Annual Review of Psychology*, 68, 465–489. doi:[10.1146/annurev-psych-010416-044022](https://doi.org/10.1146/annurev-psych-010416-044022)

**Solidité.** Méta-analyse ou consensus pour l'hypercorrection (répliquée, revue de Metcalfe 2017) et pour les illusions de compétence (revue de Bjork et al. 2013). Heuristique tirée d'un cadre pour l'usage de la Confiance dans FSRS (juste mais « pas sûr » noté « difficile »).

**Où dans Cartable.** **Confiance** et erreurs commises « sûr » retravaillées d'abord (`lib/agent.js`, commentaire « hypercorrection ») ; distinction Objectif atteint et **Retenu** (ADR 0003, mise à jour spec #46) ; Retour de quiz du **Pré-test** qui montre l'écart entre ce que l'Élève pensait savoir et ce qu'il a trouvé ; note FSRS de la réponse (`noteDeReponse`, `lib/memoire.js`).

### Difficultés désirables

**Ce qu'il dit.** Certaines conditions qui ralentissent l'apprentissage sur le moment (se tester, espacer, entrelacer, varier) le rendent plus durable. La performance du moment n'est pas l'apprentissage.

**Référence.**
- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. P. Shimamura (Eds.), *Metacognition: Knowing about knowing* (pp. 185–205). MIT Press.
- Bjork, E. L., & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: Creating desirable difficulties to enhance learning. In M. A. Gernsbacher, R. W. Pew, L. M. Hough, & J. R. Pomerantz (Eds.), *Psychology and the real world: Essays illustrating fundamental contributions to society* (pp. 56–64). Worth Publishers.

**Solidité.** Heuristique tirée d'un cadre : c'est un cadre qui regroupe des effets, chacun avec sa propre preuve (effet du test, espacement, entrelacement). Une difficulté n'est désirable que si l'Élève peut la surmonter.

**Où dans Cartable.** Principe produit « Ce qui reste compte plus que la réussite du moment » (`PRODUCT.md`) ; **Retenu**, **Pré-test**, **Défi** (plus difficile, avec le même nombre de questions : ticket #128), **Variantes** des Questions, **Maîtrise** qui baisse avec le temps.

### Découpage en segments et principe multimédia (Mayer)

**Ce qu'il dit.** On apprend mieux avec des mots et des images qu'avec des mots seuls (principe multimédia), quand la matière est présentée en segments que l'élève fait avancer à son rythme (segmentation), et sans éléments étrangers au propos (cohérence).

**Référence.**
- Mayer, R. E. (2020). *Multimedia learning* (3e éd.). Cambridge University Press. doi:[10.1017/9781316941355](https://doi.org/10.1017/9781316941355)
- Rey, G. D., Beege, M., Nebel, S., Wirzberger, M., Schmitt, T. H., & Schneider, S. (2019). A meta-analysis of the segmenting effect. *Educational Psychology Review*, 31(2), 389–419. doi:[10.1007/s10648-018-9456-4](https://doi.org/10.1007/s10648-018-9456-4)

**Solidité.** Méta-analyse ou consensus pour la segmentation (Rey et al. 2019) et le principe multimédia (synthèses de Mayer). Heuristique tirée d'un cadre pour leur application à des Pages de leçon écrites par un agent.

**Où dans Cartable.** Consigne « Visuels » du prof : un visuel qui explique, jamais seulement décoratif, et une question qui oblige à le regarder (`lib/agent.js`), une photo du sujet comme premier **Visuel** quand la page porte sur un objet, un lieu, une personne ou une œuvre réels (ticket #129 ; le choix de la photo plutôt que du schéma n'en découle pas, voir « Décisions sans fondement écrit ») ; **Page de leçon** choisie une à une, une Question à la fois dans la **Révision du jour** ; figure du **Kit** avec légende ; repère « Contenu » des schémas SVG : peu d'éléments, aucun trait ni forme qui ne porte une information (cohérence, consigne « Visuels » et section « Figure » du LISEZMOI, ticket #134).

### Contiguïté spatiale

**Ce qu'il dit.** On apprend mieux quand les mots qui décrivent une image sont placés près de ce qu'ils nomment, plutôt qu'à part (légende séparée, texte éloigné) : l'élève n'a pas à chercher le lien entre les deux. L'effet est plus net quand la matière est complexe et que mots et image ne se comprennent pas l'un sans l'autre.

**Référence.**
- Ginns, P. (2006). Integrating information: A meta-analysis of the spatial contiguity and temporal contiguity effects. *Learning and Instruction*, 16(6), 511–525. doi:[10.1016/j.learninstruc.2006.10.001](https://doi.org/10.1016/j.learninstruc.2006.10.001)
- Mayer, R. E. (2020), *Multimedia learning*, ci-dessus.

**Solidité.** Méta-analyse ou consensus pour l'effet (Ginns 2006). Heuristique tirée d'un cadre pour son application aux schémas SVG qu'un agent dessine dans une Page de leçon.

**Où dans Cartable.** Repère « Étiquettes » des schémas SVG : au plus près de ce qu'elles nomment, dans le dessin, plutôt qu'expliquées dans la légende (consigne « Visuels », `lib/agent.js` ; section « Figure », `public/kit/v1/LISEZMOI.md` ; ticket #134).

### Signalement

**Ce qu'il dit.** Mettre en évidence ce qui compte dans un support (couleur, contour, flèche, mot en gras) aide à apprendre : l'attention va d'abord à l'essentiel. Le gain est modeste, et un signalement qui met tout en évidence ne signale plus rien.

**Référence.**
- Schneider, S., Beege, M., Nebel, S., & Rey, G. D. (2018). A meta-analysis of how signaling affects learning with media. *Educational Research Review*, 23, 1–24. doi:[10.1016/j.edurev.2017.11.001](https://doi.org/10.1016/j.edurev.2017.11.001)

**Solidité.** Méta-analyse ou consensus pour l'effet (Schneider et al. 2018). Heuristique tirée d'un cadre pour la règle d'un seul élément clé par schéma.

**Où dans Cartable.** Repère « Couleurs » des schémas SVG : `var(--kit-accent)` pour un seul élément clé, reconnaissable aussi sans la couleur (consigne « Visuels », `lib/agent.js` ; section « Figure », `public/kit/v1/LISEZMOI.md` ; ticket #134). Un seul bouton plein sur l'accueil de l'Élève, le Continuer de la **Leçon** en tête, les autres actions en contour (heuristique tirée d'un cadre : la méta-analyse porte sur des supports d'apprentissage, pas sur des boutons ; `ecranAccueil`, `public/app.js`, ticket #141).

### Détails séduisants

**Ce qu'il dit.** Des détails intéressants mais sans rapport avec ce qu'il faut apprendre (anecdotes, images décoratives) font moins bien apprendre l'essentiel.

**Référence.**
- Harp, S. F., & Mayer, R. E. (1998). How seductive details do their damage: A theory of cognitive interest in science learning. *Journal of Educational Psychology*, 90(3), 414–434. doi:[10.1037/0022-0663.90.3.414](https://doi.org/10.1037/0022-0663.90.3.414)
- Rey, G. D. (2012). A review of research and a meta-analysis of the seductive detail effect. *Educational Research Review*, 7(3), 216–237. doi:[10.1016/j.edurev.2012.05.003](https://doi.org/10.1016/j.edurev.2012.05.003)
- Sundararajan, N., & Adesope, O. (2020). Keep it coherent: A meta-analysis of the seductive details effect. *Educational Psychology Review*, 32(3), 707–734. doi:[10.1007/s10648-020-09522-4](https://doi.org/10.1007/s10648-020-09522-4)

**Solidité.** Méta-analyse ou consensus (Rey 2012 ; Sundararajan & Adesope 2020), effet modeste.

**Où dans Cartable.** Interdiction des images seulement décoratives (consigne « Visuels », `lib/agent.js`) ; le **Dépassement** est un contenu hors du propos, mis à part en fin de page et hors score, réduit à 1 question bonus pour limiter ce contenu à côté (ticket #128 ; voir « Écarts relevés ») ; aucun trait ni forme sans information dans un schéma SVG (ticket #134).

### Capacité de la mémoire de travail et charge cognitive

**Ce qu'il dit.** La mémoire de travail ne tient qu'environ quatre éléments à la fois. Ce qui l'occupe sans servir l'apprentissage, comme une interface nouvelle à comprendre, en retire autant à la matière (théorie de la charge cognitive).

**Référence.**
- Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. *Behavioral and Brain Sciences*, 24(1), 87–114. doi:[10.1017/S0140525X01003922](https://doi.org/10.1017/S0140525X01003922)
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257–285. doi:[10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4)

**Solidité.** Méta-analyse ou consensus pour une capacité limitée de la mémoire de travail (Cowan 2001, revue de nombreuses études ; la valeur de quatre éléments reste discutée). Heuristique tirée d'un cadre pour la théorie de la charge cognitive (Sweller 1988, étude isolée à l'origine d'un cadre largement repris) appliquée aux quiz. Heuristique tirée d'un cadre pour la borne de 3 à 6 questions comptées par page, qui suppose qu'une page tient en 3 à 5 idées, et pour le coût de chaque nouveau format de question.

**Où dans Cartable.** Consigne « Nombre de questions » du prof : une question comptée par idée-clé, entre 3 et 6, sans chercher à couvrir tous les formats (`lib/agent.js`, ticket #128).

### Traitement approprié au transfert

**Ce qu'il dit.** Un test fait mieux retenir quand il sollicite le même traitement que l'apprentissage : la forme de la question compte autant que son contenu.

**Référence.**
- Morris, C. D., Bransford, J. D., & Franks, J. J. (1977). Levels of processing versus transfer appropriate processing. *Journal of Verbal Learning and Verbal Behavior*, 16(5), 519–533. doi:[10.1016/S0022-5371(77)80016-9](https://doi.org/10.1016/S0022-5371(77)80016-9)

**Solidité.** Étude isolée pour l'expérience fondatrice, devenue un cadre largement repris. Heuristique tirée d'un cadre pour le choix d'un format selon ce qu'il vérifie le mieux.

**Où dans Cartable.** Formats de rappel actif choisis selon le contenu, sans obligation de les couvrir tous (`FORMATS_RAPPEL_ACTIF` et consigne « Nombre de questions », `lib/agent.js`, ticket #128).

### Une seule bonne réponse par question

**Ce qu'il dit.** Une question de quiz n'a qu'une seule bonne réponse, que l'enseignement permet de reconnaître sans ambiguïté : une deuxième réponse défendable fait compter faux un élève qui sait, et le score ne mesure plus ce qu'il a appris.

**Référence.**
- Haladyna, T. M., Downing, S. M., & Rodriguez, M. C. (2002). A review of multiple-choice item-writing guidelines for classroom assessment. *Applied Measurement in Education*, 15(3), 309–333. doi:[10.1207/S15324818AME1503_5](https://doi.org/10.1207/S15324818AME1503_5)

**Solidité.** Méta-analyse ou consensus pour la règle dans un QCM (revue des manuels et des études sur la rédaction des questions). Heuristique tirée d'un cadre pour sa transposition à « remettre dans l'ordre », où l'ordre entier est la réponse.

**Où dans Cartable.** « ordre » réservé aux suites dont un seul ordre est juste et vérifiable dans la page, jamais pour une liste de conseils ou de gestes, avec « classer », « associer » ou un QCM « que fais-tu d'abord ? » à la place (`FORMATS_RAPPEL_ACTIF`, `lib/agent.js`, et `public/kit/v1/LISEZMOI.md`, ticket #130).

### Curiosité et manque d'information

**Ce qu'il dit.** La curiosité naît d'un manque d'information perçu : savoir qu'on ne sait pas quelque chose, sans le savoir encore. Une petite ouverture suffit à la provoquer.

**Référence.**
- Loewenstein, G. (1994). The psychology of curiosity: A review and reinterpretation. *Psychological Bulletin*, 116(1), 75–98. doi:[10.1037/0033-2909.116.1.75](https://doi.org/10.1037/0033-2909.116.1.75)

**Solidité.** Heuristique tirée d'un cadre : une revue théorique, appliquée ici à une question bonus.

**Où dans Cartable.** **Dépassement** : un encart « Pour aller plus loin » et 1 question bonus 🚀, hors score (`lib/agent.js`, ticket #128).

### Zone proximale de développement

**Ce qu'il dit.** Ce qu'un élève peut faire avec de l'aide, mais pas encore seul, est ce qu'il est prêt à apprendre ; l'étayage (« scaffolding ») d'un tuteur l'y amène, puis se retire.

**Référence.**
- Vygotsky, L. S. (1978). *Mind in society: The development of higher psychological processes*. Harvard University Press.
- Wood, D., Bruner, J. S., & Ross, G. (1976). The role of tutoring in problem solving. *Journal of Child Psychology and Psychiatry*, 17(2), 89–100. doi:[10.1111/j.1469-7610.1976.tb00381.x](https://doi.org/10.1111/j.1469-7610.1976.tb00381.x)

**Solidité.** Heuristique tirée d'un cadre : cadre théorique très influent, mais sans mesure opérationnelle de la zone ; dans Cartable, c'est le jugement du prof.

**Où dans Cartable.** Rebond **Étape suivante**, page nouvelle choisie « selon la zone proximale de l'élève » (`lib/agent.js`) ; pages choisies une à une sans plan (ADR 0002, ADR 0003) ; **Cadrage** et **Pré-test**, qui situent l'Élève.

### Maîtrise avant d'avancer

**Ce qu'il dit.** La pédagogie de maîtrise fait atteindre un critère de réussite à chaque unité, avec correction et reprise, avant de passer à la suivante ; elle améliore les résultats en moyenne.

**Référence.**
- Bloom, B. S. (1968). Learning for mastery. *Evaluation Comment*, 1(2). UCLA Center for the Study of Evaluation of Instructional Programs.
- Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990). Effectiveness of mastery learning programs: A meta-analysis. *Review of Educational Research*, 60(2), 265–299. doi:[10.3102/00346543060002265](https://doi.org/10.3102/00346543060002265)

**Solidité.** Méta-analyse ou consensus pour le principe d'un critère avant d'avancer. La valeur du critère n'en découle pas (voir « Décisions sans fondement écrit », seuil de 80 %).

**Où dans Cartable.** **Rebond** Revoir sous 80 % et Défi au-delà, en Leçon de révision ; **Objectif** atteint à 80 % ; **Leçon terminée** ; ADR 0002 et ADR 0003.

### Retours et récompenses

**Ce qu'il dit.** Un retour aide quand il porte sur la tâche et sur la façon de s'améliorer, et peut nuire quand il porte sur la personne. Des récompenses attendues et conditionnées à la tâche réduisent en moyenne la motivation intrinsèque, alors que des retours verbaux positifs l'entretiennent. Féliciter un enfant pour son intelligence plutôt que pour son effort l'a rendu moins persévérant après un échec, dans les études d'origine ; une réplication à grande échelle ne l'a pas retrouvé.

**Référence.**
- Kluger, A. N., & DeNisi, A. (1996). The effects of feedback interventions on performance: A historical review, a meta-analysis, and a preliminary feedback intervention theory. *Psychological Bulletin*, 119(2), 254–284. doi:[10.1037/0033-2909.119.2.254](https://doi.org/10.1037/0033-2909.119.2.254)
- Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*, 77(1), 81–112. doi:[10.3102/003465430298487](https://doi.org/10.3102/003465430298487)
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6), 627–668. doi:[10.1037/0033-2909.125.6.627](https://doi.org/10.1037/0033-2909.125.6.627)
- Mueller, C. M., & Dweck, C. S. (1998). Praise for intelligence can undermine children's motivation and performance. *Journal of Personality and Social Psychology*, 75(1), 33–52. doi:[10.1037/0022-3514.75.1.33](https://doi.org/10.1037/0022-3514.75.1.33)
- Li, Y., & Bates, T. C. (2019). You can't change your basic ability, but you work at things, and that's how we get hard things done: Testing the role of growth mindset on response to setbacks, educational attainment, and cognitive ability. *Journal of Experimental Psychology: General*, 148(9), 1640–1655. doi:[10.1037/xge0000669](https://doi.org/10.1037/xge0000669)

**Solidité.** Méta-analyse ou consensus pour les retours (Kluger & DeNisi 1996) et les récompenses extrinsèques (Deci et al. 1999), mais ces études portent sur des récompenses tangibles : leur transposition à des Étoiles et des Badges virtuels est une heuristique tirée d'un cadre. Étude isolée, contestée, pour l'éloge de l'effort.

**Où dans Cartable.** **Retour de quiz** et commentaires du prof sur les questions ratées ; **Étoiles**, **Fusées**, **Badges** qui saluent l'effort et ce qui reste en mémoire ; principe « Encourager l'effort, jamais comparer » (`PRODUCT.md`) ; **Série de jours** et **Jokers**.

## Ergonomie et accessibilité

### WCAG 2.2 AA

**Ce qu'il dit.** Norme du W3C pour l'accessibilité des contenus web. Au niveau AA, entre autres : contraste d'au moins 4.5:1 pour le texte courant (1.4.3) et 3:1 pour les éléments d'interface (1.4.11), focus visible (2.4.7) et non masqué (2.4.11), cibles d'au moins 24 × 24 px CSS (2.5.8), texte qui supporte un espacement agrandi (1.4.12).

**Référence.** W3C (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. Recommandation du W3C. [https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/)

**Solidité.** Méta-analyse ou consensus : norme internationale publiée.

**Où dans Cartable.** « Bonnes pratiques générales (WCAG AA) comme base » (`PRODUCT.md`) ; jetons de couleur des deux thèmes, anneau de focus de 3px et cibles tactiles (`DESIGN.md`, `public/style.css`) ; style de base du **Kit** (`public/kit/v1/base.css`) ; dans un schéma SVG, l'élément clé reconnaissable aussi sans la couleur (1.4.1 Utilisation de la couleur), et l'encre en `currentColor` et les couleurs du Kit, qui suivent le mode sombre (ticket #134).

### Lisibilité pour la dyslexie

**Ce qu'il dit.** Pour des lecteurs dyslexiques : police sans empattement, corps assez grand, interlignage et espacement des lettres généreux, texte aligné à gauche, pas d'italique ni de soulignement, phrases courtes. Les polices « spéciales dyslexie » (OpenDyslexic, Dyslexie) n'apportent pas de gain mesuré ; un espacement des lettres plus large en apporte un. La synthèse vocale aide en moyenne la compréhension des élèves en difficulté de lecture.

**Référence.**
- British Dyslexia Association (2023). *Dyslexia style guide 2023*. [https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf](https://cdn.bdadyslexia.org.uk/uploads/documents/Advice/style-guide/BDA-Style-Guide-2023.pdf)
- Rello, L., & Baeza-Yates, R. (2013). Good fonts for dyslexia. *Proceedings of the 15th International ACM SIGACCESS Conference on Computers and Accessibility (ASSETS '13)*, 1–8. doi:[10.1145/2513383.2513447](https://doi.org/10.1145/2513383.2513447)
- Zorzi, M., Barbiero, C., Facoetti, A., Lonciari, I., Carrozzi, M., Montico, M., et al. (2012). Extra-large letter spacing improves reading in dyslexia. *Proceedings of the National Academy of Sciences*, 109(28), 11455–11459. doi:[10.1073/pnas.1205566109](https://doi.org/10.1073/pnas.1205566109)
- Wery, J. J., & Diliberto, J. A. (2017). The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy. *Annals of Dyslexia*, 67(2), 114–127. doi:[10.1007/s11881-016-0127-1](https://doi.org/10.1007/s11881-016-0127-1)
- Kuster, S. M., van Weerdenburg, M., Gompel, M., & Bosman, A. M. T. (2018). Dyslexie font does not benefit reading in children with or without dyslexia. *Annals of Dyslexia*, 68(1), 25–42. doi:[10.1007/s11881-017-0154-6](https://doi.org/10.1007/s11881-017-0154-6)
- Wood, S. G., Moxley, J. H., Tighe, E. L., & Wagner, R. K. (2018). Does use of text-to-speech and related read-aloud tools improve reading comprehension for students with reading disabilities? A meta-analysis. *Journal of Learning Disabilities*, 51(1), 73–84. doi:[10.1177/0022219416688170](https://doi.org/10.1177/0022219416688170)

**Solidité.** Heuristique tirée d'un cadre pour le guide de la BDA (recommandations d'association, en partie fondées sur des études). Étude isolée pour l'espacement des lettres et pour l'absence d'effet des polices spécialisées. Méta-analyse ou consensus pour la synthèse vocale (Wood et al. 2018).

**Où dans Cartable.** Accessibilité de `PRODUCT.md` (dyslexie, textes courts, une chose à faire à la fois) ; Atkinson Hyperlegible Next, sans empattement, et corps de 17px (`DESIGN.md`) ; **Lecture à voix haute** ; « messages courts » demandés au prof (`lib/agent.js`) ; aucune `font-family` dans un schéma SVG, qui garde la police du Kit, et textes de schéma d'au moins 14 px rendus (seuil sans cadre, voir « Décisions sans fondement écrit » ; ticket #134).

### Taille des cibles tactiles

**Ce qu'il dit.** Les cibles trop petites font rater le toucher, surtout au pouce. WCAG 2.2 exige 24 × 24 px CSS au niveau AA (2.5.8) et 44 × 44 px au niveau AAA (2.5.5) ; une étude au pouce trouve qu'environ 9.2 mm suffisent pour une cible isolée.

**Référence.**
- W3C (2023), *WCAG 2.2*, ci-dessus ; [Understanding Success Criterion 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Parhi, P., Karlson, A. K., & Bederson, B. B. (2006). Target size study for one-handed thumb use on small touchscreen devices. *Proceedings of the 8th Conference on Human-Computer Interaction with Mobile Devices and Services (MobileHCI '06)*, 203–210. doi:[10.1145/1152215.1152260](https://doi.org/10.1145/1152215.1152260)

**Solidité.** Méta-analyse ou consensus pour la norme. Étude isolée pour la taille au pouce, mesurée chez des adultes, pas chez des enfants.

**Où dans Cartable.** « Cibles tactiles confortables pour la tablette » (`PRODUCT.md`) ; « cibles tactiles d'au moins 2.6rem » (`DESIGN.md`) ; boutons de 2.75rem (`public/style.css`) ; aucune saisie au clavier pendant une Séance (ADR 0002).

## Décisions sans fondement écrit

Décisions actuelles pour lesquelles aucun cadre solide n'a été trouvé. Ce sont des hypothèses à mesurer : les journaux de Cartable (réponses, scores, Révisions du jour) permettent de les tester.

| Décision | Où | Ce qu'en disent les cadres |
| --- | --- | --- |
| Seuil de 80 % (Objectif atteint, Rebond Revoir ou Défi, Leçon terminée, Étoiles, palier « bien en tête ») | `CONTEXT.md`, ADR 0002, ADR 0003 | La pédagogie de maîtrise demande un critère, pas cette valeur. Sur un quiz de 4 ou 5 questions, 80 % se joue à une réponse. Aucun cadre, hypothèse à mesurer. |
| Paliers de Maîtrise à 50 % et 80 % | `CONTEXT.md`, ADR 0006 | Aucun cadre, hypothèse à mesurer. |
| **Retenu** : deux succès à au moins 24 heures d'écart, ou stabilité d'au moins 5 jours | `CONTEXT.md`, ADR 0003 | Inspiré du réapprentissage espacé, qui recommande plutôt environ trois rappels réussis puis des sessions espacées (Rawson & Dunlosky 2011). Les valeurs 2, 24 heures et 5 jours : aucun cadre, hypothèse à mesurer. |
| Rétention visée de 90 % dans FSRS | `lib/memoire.js`, ADR 0006 | Valeur par défaut de FSRS et d'Anki, pas un optimum démontré pour des enfants. Aucun cadre, hypothèse à mesurer. |
| Note FSRS de la Confiance : juste mais « pas sûr » vaut « difficile » | `lib/memoire.js`, ADR 0006 | L'hypercorrection porte sur les erreurs commises « sûr », pas sur cette correspondance. Aucun cadre, hypothèse à mesurer. |
| Nombre de Propositions d'un lot (2 à 10, 4 par défaut) | Profil, `CONTEXT.md` | L'effet de surcharge du choix (Iyengar & Lepper 2000, doi:[10.1037/0022-3514.79.6.995](https://doi.org/10.1037/0022-3514.79.6.995)) n'est pas confirmé en moyenne par la méta-analyse de Scheibehenne, Greifeneder & Todd (2010, doi:[10.1086/651235](https://doi.org/10.1086/651235)). Aucun cadre, hypothèse à mesurer. |
| 2 à 4 **Réponses proposées**, toujours avec « Je ne sais pas » | ADR 0002 | Aucun cadre, hypothèse à mesurer. |
| **Révision du jour** de 10 Questions au plus | ADR 0006 | Aucun cadre, hypothèse à mesurer. |
| **Objectif du jour** : 5 réponses ou une Page de leçon | `CONTEXT.md` | Aucun cadre, hypothèse à mesurer. |
| 3 **Jokers** par semaine | `lib/rythme.js` | Aucun cadre, hypothèse à mesurer. |
| **Pré-test** de trois questions | `lib/agent.js` | L'effet du pré-test ne dit pas combien de questions poser. Aucun cadre, hypothèse à mesurer. |
| **Dépassement réussi** à `min(2, total)` questions bonus : la valeur 2 gardée pour les anciennes pages à 2 ou 3 questions bonus | `lib/store.js`, `CONTEXT.md` | Aucun cadre, hypothèse à mesurer. |
| Au moins 2 et au plus 6 questions en **Revoir**, quel que soit le nombre de questions ratées | `lib/agent.js` | La correction suivie d'un nouveau test porte sur chaque erreur, pas sur ces bornes. Aucun cadre, hypothèse à mesurer. |
| Quiz plus courts (3 à 6 questions comptées) sans Questions moins bien retenues | `lib/agent.js`, ticket #128 | Conséquence attendue des cadres ci-dessus, non mesurée : à vérifier avec les journaux. |
| **Variantes** écrites après deux réponses à une Question | ADR 0006 | Varier la formulation est une difficulté désirable, mais le moment choisi n'a pas de cadre. Hypothèse à mesurer. |
| Au plus une question « ordre » par quiz, pas dans chaque quiz, et formats variés d'une page à l'autre de la **Leçon** | `lib/agent.js`, `public/kit/v1/LISEZMOI.md`, ticket #130 | Aucun cadre, hypothèse à mesurer. |
| Pas de question « ordre » dans le **Pré-test** (QCM ou « classer » à la place) | `consignePremierTour`, `lib/agent.js`, ticket #130 | L'effet du pré-test ne dit rien du format des questions. Aucun cadre, hypothèse à mesurer. |
| Une question « ordre » ne reprend pas les éléments d'une question « ordre » d'une page précédente | `lib/agent.js`, ticket #130 | Proche de « une idée n'est pas interrogée deux fois sur la même page » (espacement), mais la règle porte sur des pages voisines, pas sur l'intervalle. Aucun cadre, hypothèse à mesurer. |
| « ordre » retiré de la tête de la liste des formats donnée au prof, pour que l'ordre de la liste ne pousse pas à le choisir | `FORMATS_RAPPEL_ACTIF`, `lib/agent.js`, ticket #130 | Aucun cadre, hypothèse à mesurer (constaté dans les Leçons : « ordre » dans 10 quiz sur 14). |
| Moins de questions « réfléchis puis dévoile » que d'autres (1 au plus sur un quiz de 3 ou 4 questions comptées, 2 sur 5 ou 6) | `lib/agent.js`, `public/kit/v1/LISEZMOI.md` | Aucun cadre, hypothèse à mesurer (l'autonotation de l'Élève n'est pas vérifiée). |
| Leçon la plus récente en tête : sur l'accueil, la **Leçon** à la dernière activité la plus récente passe au-dessus des Catégories (« Tu en étais là »), et son Continuer est le seul bouton plein | `ecranAccueil`, `public/app.js`, ticket #141 | Le seul bouton plein relève du signalement (ci-dessus) ; le choix de la Leçon la plus récente, plutôt que celle dont des Questions sont dues ou dont un contrôle approche, n'en découle pas. Aucun cadre, hypothèse à mesurer (part des Séances lancées depuis la Leçon en tête). |
| Photo obligatoire pour un sujet réel (objet, lieu, personne ou œuvre) : premier **Visuel** de la page | `lib/agent.js`, `public/kit/v1/LISEZMOI.md`, ticket #129 | Le principe multimédia soutient mots + image, pas la photo plutôt que le schéma. Aucun cadre, hypothèse à mesurer. Deux mesures à noter : le **Coût d'un tour** de type page avant et après le changement, et la part des pages sur un sujet réel qui ont bien une photo, sur les 10 prochaines pages concernées. |
| Photo prise dans une source déjà consultée pour vérifier les faits, dans le même WebFetch | `lib/agent.js`, ticket #129 | Décision de coût, aucun cadre. Mesurée par le **Coût d'un tour** (ligne précédente). |
| **Pré-test** exempté de la photo du sujet réel | `lib/agent.js`, ticket #129 | Le Pré-test n'enseigne pas. Aucun cadre, hypothèse sans mesure prévue. |
| Textes d'un schéma SVG d'au moins 14 px rendus sur un écran de 360 px, traits d'au moins 1,5 px | `lib/agent.js`, `public/kit/v1/LISEZMOI.md`, `lib/schemas.js`, ticket #134 | WCAG 2.2 ne fixe pas de taille minimale de texte ; la lisibilité pour la dyslexie demande un corps « assez grand », sans valeur. Aucun cadre, hypothèse à mesurer : refaire la critique des schémas (12/28 au départ) sur trois nouvelles pages à schéma. |
| Schéma estimé à 300 px de large sur un écran de 360 px (repère des règles en unités de viewBox) | `lib/schemas.js`, ticket #134 | Mesure de la figure du Kit dans Chromium, pas un cadre. Aucun cadre, hypothèse à mesurer. |

## Écarts relevés

Décisions où les cadres ci-dessus vont contre la règle de Cartable, ou ne la soutiennent qu'à moitié. Ce registre ne change aucune règle : chacun de ces écarts doit devenir sa propre issue.

- **Entrelacement entre matières.** _Contredit l'ADR 0006 (Révisions mélangées entre Leçons), à rouvrir parce que…_ les Révisions du jour mélangent des Leçons de matières différentes au nom de l'entrelacement (ADR 0006), mais la méta-analyse de Brunmair & Richter (2019) ne trouve le bénéfice que pour des catégories proches. Le mélange reste défendable pour l'espacement, pas pour « apprendre à reconnaître de quoi il s'agit ».
- **Dépassement et détails séduisants.** Un encart « Pour aller plus loin » est par définition hors du propos de la page. Le mettre en fin de page et hors score limite le risque, mais cette protection n'est pas mesurée.
- **Étoiles conditionnées au score.** Les Étoiles d'un quiz réussi (80 % ou plus) sont une récompense attendue, conditionnée à la performance : une forme qui, en moyenne, réduit la motivation intrinsèque chez Deci et al. (1999), si l'effet vaut pour des récompenses virtuelles.
- **Lecture à voix haute et texte affiché.** Le principe de redondance de Mayer (2020) déconseille d'ajouter le texte écrit à une image déjà commentée à voix haute, ce qui rapproche la lecture mot pour mot d'un texte affiché d'une redondance, alors que la synthèse vocale aide les élèves en difficulté de lecture (Wood et al. 2018). Le réglage, coupé par défaut et choisi pour un Élève, est cohérent avec les deux ; l'activer pour tous ne le serait pas.
- **Police pour la dyslexie.** Atkinson Hyperlegible Next a été dessinée pour les lecteurs malvoyants ; aucune étude trouvée ne mesure son effet chez les lecteurs dyslexiques.
- **Saisie libre et effet de génération.** _Contredit en partie l'ADR 0002 (Séance sans saisie libre), sans la remettre en cause :_ sans clavier, l'Élève ne produit jamais une réponse de lui-même, sauf de tête dans « réfléchis puis dévoile » ; l'effet de génération (Slamecka & Graf 1978) et le format des tests (Kang et al. 2007) indiquent que produire retient mieux que choisir. C'est le prix, accepté, de la sécurité d'un Élève enfant.
