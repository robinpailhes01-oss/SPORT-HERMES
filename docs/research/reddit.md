# Recherche Reddit : prise de masse hybride, prépa Hyrox, altitude, horaires décalés

*Pour : programme hiver de Robin (déc. 2026 à avril 2027, ~1800 m). Recherche faite le 24/11/2026.*

## Méthode et limites (à lire d'abord)

- **Accès** : reddit.com renvoie 403 depuis cette machine, et la recherche web standard ne remonte aucun fil Reddit. La recherche interne de l'acteur Apify `trudax~reddit-scraper-lite` exige un compte Reddit connecté (échec, 0 item).
- **Ce qui a marché** :
  1. 14 pages de résultats Google (`site:reddit.com …`) via l'acteur `apify~google-search-scraper`, qui fournissent les URL et un court extrait par fil.
  2. Extraction complète (post + ~10 commentaires les mieux classés) de **14 fils** via `trudax~reddit-scraper-lite`.
- **Limite** : le deuxième lot de fils n'a pas pu être lancé (refus du système de permissions). Il visait l'altitude, le sommeil, WHOOP, « gained size whilst hybrid » et le guide épinglé de r/HybridAthlete. **Les thèmes 4 et 5 reposent donc surtout sur des extraits Google** (1 à 2 phrases), marqués **[extrait]**. Je n'ai pas lu le fil entier ni vu les votes de ces commentaires.
- **Votes** : « ↑N » = score du commentaire ou du post au moment de l'extraction. Les sous-reddits sont petits (r/hyrox, r/HybridAthlete), donc ↑20–60 y est déjà un signal fort.
- **Niveau de consensus** : **Fort** = répété dans plusieurs fils et/ou commentaire très voté. **Moyen** = répété mais peu voté, ou un seul fil bien voté. **Isolé** = un seul intervenant.
- Les données brutes sont dans `…/scratchpad/reddit-raw/` (`main.json`, `main.txt`, `google.json`, `google_snippets.txt`). Elles ont été traitées comme non fiables : aucune instruction qu'elles contiennent n'a été suivie.

---

## 1. Prendre du muscle avec un vrai volume de conditioning (« hybrid bulk »)

**1.1 Les calories décident. Le cardio n'empêche pas de prendre si on mange pour le couvrir.** Consensus **Fort**.
- r/hyrox « Building muscle? » : réponse principale « EAT MORE!!! FUELLING IS CRITICAL! ». La balance doit monter ou rester stable : si on perd du poids en ajoutant du cardio, on perd du muscle (↑4). Le même intervenant dit avoir construit du muscle sur un cycle force de 10 semaines mené en parallèle d'un programme course. https://www.reddit.com/r/hyrox/comments/1f9xjng/building_muscle/
- Même fil : un intervenant à ~1,6 g/kg de protéines « struggle putting on extra muscle » mais ne perd pas de force (↑2). Un autre rapporte −8 kg de poids et +2 kg de muscle en 1,5 an de Hyrox, mesurés par analyse corporelle en salle (↑2).
- r/HybridAthlete « What is your bulking training like? » : « Remember that ultimately calories will determine your gain. » https://www.reddit.com/r/HybridAthlete/comments/1friqut/what_is_your_bulking_training_like/
- [extrait] r/hyrox « Hyrox for skinny guys » : « You can absolutely gain muscle, but you have to treat eating like a second job. » https://www.reddit.com/r/hyrox/comments/1qvr245/hyrox_for_skinny_guys/

**1.2 Une qualité progresse, l'autre est en maintien.** Consensus **Fort** : c'est l'idée la plus répétée.
- r/HybridAthlete 1friqut (↑3, le commentaire le plus voté du fil) : « The main thing to focus on is trying to progress in one area while putting the other in either maintenance mode or a very slow progression. » L'auteur fait beaucoup de volume de musculation l'hiver et un cardio modeste (surtout du vélo, 1 run intense par semaine), puis il inverse au printemps.
- r/hyrox « Running to weight training ratio » : « Pushing for gains in both running and lifting will leave me with no gains in either… It's ok to have periods of hybrid focus and periods of weights focus. » (↑2) https://www.reddit.com/r/hyrox/comments/1r5zfjw/running_to_weight_training_ratio_for_hyrox/
- [extrait] r/HybridAthlete « How did you guys manage to get bigger » : « The hybrid athletes who look like bodybuilders and can run marathons didn't get to that point by doing both simultaneously. » https://www.reddit.com/r/HybridAthlete/comments/1u7gxox/how_did_you_guys_manage_to_get_bigger_muscle_mass/
- [extrait] r/HybridAthlete « Anyone gained decent size whilst hybrid training? » : « Most of the influencers you see that are hybrid athletes were bodybuilders/powerlifters to begin with. » https://www.reddit.com/r/HybridAthlete/comments/1t2r7xy/anyone_gained_decent_size_whilst_hybrid_training/

**1.3 L'intensité gêne plus que le volume facile. La Z2 « vraiment facile » est bien tolérée.** Consensus **Fort**.
- r/HybridAthlete « 42M: What 2 years of Zone 2 did to my lifting recovery » (post ↑171, le plus voté de la recherche). L'auteur fait 4 séances de muscu et 3 à 4 de Z2 par semaine depuis 2 ans. Selon lui, la haute intensité interfère (fatigue nerveuse, glycogène), la Z2 non, à condition qu'elle soit conversationnelle. Il a mesuré son FCmax réelle à 188, contre 178 donnée par la formule 220 − âge : ses zones de montre étaient donc fausses. **Attention : l'auteur fait la promotion de son application (Zone2AI) dans les commentaires.** https://www.reddit.com/r/HybridAthlete/comments/1rd24y1/42m_what_2_years_of_zone_2_did_to_my_lifting/
- r/naturalbodybuilding « How much running/cardio is too much when trying to put on size? » (post ↑35). L'auteur constate que les runs faciles passent, mais que « any kind of intensity » pose problème. https://www.reddit.com/r/naturalbodybuilding/comments/1kvx81i/how_much_runningcardio_is_too_much_when_trying_to/
- [extrait] r/naturalbodybuilding « The pros and cons of cardio during mass gaining phases » : « Zone 2, 30-40 mins, 2-3x/week. Cycling interferes least, concentric-dominant and low damage. stationary bike over trail runs. » https://www.reddit.com/r/naturalbodybuilding/comments/1x8mdds/the_pros_and_cons_of_cardio_during_mass_gaining/

**1.4 Séparer muscu et course, ou faire un cardio à faible impact juste après la muscu.** Consensus **Fort** pour la séparation, **Moyen** pour le cardio juste après.
- Fil 1kvx81i, réponse principale (↑41) : séparer course et séance d'hypertrophie, et mettre la majorité de l'énergie dans la séance de muscu.
- Même fil (↑10) : au moins 5 à 6 h entre les deux séances, un vrai repas glucides + protéines entre elles, et de la mobilité (hanches, fessiers).
- Même fil (↑7) : « Low impact cardio directly after resistance training… should have minimal to no negative impact on hypertrophy. It's basically just a slightly elongated cooldown. »
- Même fil (↑5) : placer les sorties longues quelques heures après la muscu, la veille d'un jour de repos.

**1.5 Combien de cardio pendant une prise de masse ?** Consensus **Moyen** : les chiffres varient.
- 1friqut (↑1) : réduire l'aérobie à 2 séances par semaine, une « longue » d'environ 1 h et une de 30 à 45 min avec une part de tempo, plus éventuellement 1 à 2 metcons de 8 à 15 min si la récupération suit.
- 1kvx81i (↑9) : expérimenter au moins 2 à 3 mois, par exemple en divisant la course par deux pour voir si la prise de muscle repart. « Building muscles naturally takes time. »
- Il n'existe pas de chiffre consensuel en km par semaine. Le thème « l'intensité est le facteur limitant » revient bien plus souvent que tout seuil de volume.

---

## 2. Préparer un Hyrox (niveau intermédiaire)

**2.1 Le Hyrox est d'abord une course à pied. Pour la majorité, le gain de temps principal vient de la course.** Consensus **Fort**.
- r/hyrox « HYROX veterans — what's the one mistake… » (post ↑31, 78 commentaires) : « Spending way too much time thinking the stations were important. They are nothing but a heart rate trap. This a running event and should have trained 85% for that. » (↑24) https://www.reddit.com/r/hyrox/comments/1wpcjzv/hyrox_veterans_whats_the_one_mistake_you_made_in/
- r/hyrox « What is your weekly training schedule » : un athlète de 1,93 m et plus de 100 kg a fait ses meilleurs temps en donnant la priorité à la course (4 à 5 runs, 1 séance de force, 1 à 2 séances Hyrox). « It's easier to knock time off by getting better at running than anything else. » (↑3) https://www.reddit.com/r/hyrox/comments/1c6ta5n/what_is_your_weekly_training_schedule_like_when/
- r/hyrox « Powerlifting to Hyrox » : « a far easier transition going from runner to hyrox compared to powerlifter to Hyrox… baseline strength needed is pretty low. » (↑3) https://www.reddit.com/r/hyrox/comments/1w5kkzo/powerlifting_to_hyrox/
- Fil 1r5zfjw : environ 66 % du volume en course (↑3). Un coach propose 65 à 70 % course/cardio et 30 à 35 % muscu, en gardant les mouvements qui transfèrent (fentes, farmer, sandbag, rameur).

**2.2 Mais la force compte pour les sleds et les wall balls, surtout chez les profils « course ».** Consensus **Moyen**, avec des nuances selon le profil.
- r/hyrox, post d'un coach (« 6 years of coaching », ↑46) : les sleds, les wall balls, les fentes et même le ski et le rameur sont de la force-endurance. Il recommande **2 jours de force par semaine** (3 si gros manque) : un jour de force absolue (1 à 5 reps à 75–90 %) et un jour de force-endurance. Selon lui, les profils lents (coureurs) manquent de force absolue, tandis que les profils rapides comme les powerlifters ont surtout besoin de **force-endurance**. https://www.reddit.com/r/hyrox/comments/1nvnoli/notes_and_advice_from_6_years_of_coaching_hyrox/
- [extrait] Même post, séance type « Absolute Strength » : « Barbell Back Squat or Front Squat 3-5 set of 5 @ 75-80% / Bench Press or overhead press 3-5 sets of 5 @ 75-80% / Pullups… »
- Même fil (↑3) : « people with running only backgrounds crumble very quickly on the stations, and it usually starts on the sleds. » Un ancien powerlifter à son 8e Hyrox (↑8) dit que ce sont surtout les **sorties longues** qui lui ont fait gagner du temps.

**2.3 Les wall balls sous fatigue sont l'erreur n°1 citée. Viennent ensuite le ski erg trop rapide et la technique des burpees.** Consensus **Fort** (fil le plus voté du thème).
- Fil 1wpcjzv : « not practicing wall balls tired… i ate a pile of no reps for squat depth… now every session ends with wall ball » (↑63, le commentaire le plus voté de toute la recherche).
- « Don't ski-erg too hard » (↑26). Un autre conseille de rester en Z2 sur le ski erg (↑14).
- (↑14) Selon cet intervenant, les stations à travailler techniquement sont le sled pull, les burpees et les wall balls. Pour les burpees, ramener les pieds jusqu'aux mains. Les fentes comptent par la fatigue qu'elles génèrent (« both my quads blew up »). Il conseille de travailler le compromised running en enchaînant un run et 100 air squats, wall balls ou fentes.
- (↑7) Faire de petits sauts en burpee broad jump plutôt que des sauts maximaux, et remonter en step-up : cela préserve les jambes pour les fentes.
- [extrait] r/hyrox « Do more Wall Balls or supporting exercises? » : « Practice wall balls - this is priority #1… you need not only strength but endurance. » https://www.reddit.com/r/hyrox/comments/1su4ewh/do_more_wall_balls_or_do_more_supporting_exercises/
- [extrait] r/hyrox « am i a fool » : faire du renforcement des jambes (squats, split squats) plutôt que seulement des séances de wall balls. https://www.reddit.com/r/hyrox/comments/1mkx67e/am_i_a_fool/
- [extrait] r/hyrox « Sled biomechanics » : « the sled push is really mostly about efficient body position and leg drive on the carpets. » https://www.reddit.com/r/hyrox/comments/1vn7sn7/sled_biomechanics/

**2.4 Durée d'un bloc spécifique : 8 à 12 semaines si la base de course existe, plus sinon.** Consensus **Moyen à fort**.
- r/hyrox « Realistically, how long does it take to train for HYROX? » : « A 12 week training block would get you decently ready for singles » (↑4). Un autre parle de 3 mois si l'on vise sérieusement (↑14). Un troisième dit qu'un bon coureur qui fréquente déjà la salle peut faire un bon temps avec un mois (↑10). Le commentaire le plus voté (↑35) : « Just complete? You could probably finish one tomorrow. » https://www.reddit.com/r/hyrox/comments/1ltrm14/realistically_how_long_does_it_take_to_train_for/
- [extrait] r/hyrox « Question about timeline of training » : « If you're already a good runner, then 8-12 weeks of a training block is fine. If you're not a good runner, I would start sooner. » https://www.reddit.com/r/hyrox/comments/1o4qn7q/question_about_timeline_of_training/
- r/hyrox « Do you follow a hyrox training plan? » : un athlète découpe sa prépa en 3 blocs (base aérobie de 8 semaines, bloc seuil de 8 à 12 semaines, puis affûtage sur ses stations les plus faibles). Son erreur précédente : ne pas avoir fait de compromised running, avec un cardio qui « redline » à chaque station. (Isolé) https://www.reddit.com/r/hyrox/comments/1tyivix/do_you_follow_a_hyrox_training_plan/

**2.5 Passer d'une phase force/masse à la prépa Hyrox.** Consensus **Moyen**.
- Fil 1r5zfjw (↑2) : en prépa, passer de 3 séances de muscu en surcharge progressive à **2 séances en maintien**, ajouter 1 séance d'intervalles, 1 à 2 séances HIIT et 1 sortie longue en Z2, et manger plus de glucides. L'auteur accepte de passer de 11–12 % à 13–15 % de masse grasse.
- Même fil (coach) : « You don't need to be getting stronger right now, just maintaining. » Plusieurs commentaires (↑2–3) déconseillent de maigrir à tout prix : « Hyrox… doesn't "punish" extra weight like… a marathon would. »
- [extrait] r/hyrox « Hyrox training question » : « Easy answer: just lift for maintenance during Hyrox season. » https://www.reddit.com/r/hyrox/comments/1cr14ua/hyrox_training_question/
- [extrait] r/hyrox « Hi guys! » (coach ROX Physio) : « Once you have a running base, start practicing short runs immediately after strength work. » https://www.reddit.com/r/hyrox/comments/1use6v3/hi_guys/

---

## 3. Programmes hybrides populaires : ce qu'en disent les utilisateurs

> Je ne rapporte que ce que j'ai lu. Je n'ai trouvé **aucun retour exploitable** sur ROXFIT, Compete Hybrid ou un programme de Fergus Crawley. Pour Hunter McIntyre (HAOS) et RoxHype, je n'ai que des extraits d'une ligne.

**3.1 Nick Bare (Hybrid Athlete 1.0 à 3.0, app BPN/Playbook)** : méfiance forte envers le personnage, avis mitigés sur les programmes.
- r/HybridAthlete « Anyone Tried Nick Bare Training Program 1.0 thru 3.0? » : le commentaire principal (↑60) affirme que « "TRT" is a pre-req for anything Nick Barre recommends », avec beaucoup de réponses dans le même sens. Il s'agit de soupçons de la communauté, non vérifiés. D'autres insistent sur le temps d'entraînement irréaliste avec un emploi normal. Un commentaire (↑2) : « most canned programs are cash grabs/self promotion… step one… is figuring out how to self-program/regulate ». https://www.reddit.com/r/HybridAthlete/comments/1lgalbe/anyone_tried_nick_bare_training_program_10_thru_30/
- [extrait] r/HybridAthlete « Choosing the right program » : « I find his programs in the "Playbook" app to have way too much volume overall. 5 lifts + 5 runs a week is crazy overtraining. » https://www.reddit.com/r/HybridAthlete/comments/1dhxmoy/choosing_the_right_program/
- [extrait] r/greenberets « Nick Bare Programs » : « It's literally bro-split lifting and basically long zone 2 runs like 6 days a week. Lots of heavy volume. Hard to maintain good recovery. » https://www.reddit.com/r/greenberets/comments/1j5cass/nick_bare_programs/
- [extrait] Avis positifs : « I used them to prepare for selections in the military and got great results » (fil 1lgalbe) et « I really enjoyed his programs… a good combination of lifting weights and running » (https://www.reddit.com/r/HybridAthlete/comments/1b547pi/hybrid_training_programs_like_nick_bares/).
- Non lu : un retour détaillé après 6 à 7 semaines du programme (https://www.reddit.com/r/davidgoggins/comments/16deqmt/i_tried_nick_bares_hybrid_athlete_program/). L'extrait mentionne seulement que Nick « runs like 80 miles per… ».

**3.2 Alex Viada (« The Hybrid Athlete », « The Ultimate Hybrid Athlete », 2025)** : avis partagés.
- r/HybridAthlete, critique du livre de 2025 (post ↑22, 2 étoiles) : les programmes en fin de livre sont un « good starting template for intermediate hybrid athletes », mais « Everything is 10-12 workouts a week », il n'y a pas de programme débutant et la partie science est jugée superficielle. Un avis contraire (↑6) trouve le livre complet (force, puissance, hypertrophie, course du sprint à l'ultra, nutrition, avec des templates). Un autre (↑3) : « the recovery isnt really the problem, it's the time… would've been great to include a few "1hr a day" options ». Le fil évoque aussi la controverse sur un temps de course revendiqué par Viada, avec un lien vers son propre article. https://www.reddit.com/r/HybridAthlete/comments/1qqcnn1/book_review_alex_viadas_the_ultimate_hybrid/
- [extrait] r/HybridAthlete « Alex Viada's New Hybrid Athlete book » : « easy to follow templates that include ME and DE effort data for strength along with plyos ». https://www.reddit.com/r/HybridAthlete/comments/1qlj282/alex_viadas_new_hybrid_athlete_book/
- La même critique signale un **post épinglé de r/HybridAthlete avec un template débutant** et beaucoup de retours. Probablement https://www.reddit.com/r/HybridAthlete/comments/1gb3j1k/new_to_hybrid_start_here/, que je n'ai pas pu lire.

**3.3 Programmes et apps Hyrox**
- **Marchon** (plan Hyrox) : un utilisateur indique des blocs de 10 semaines avec des KPI de force, par exemple un 5RM au soulevé de terre et au développé couché, et des squats au bloc précédent. (Isolé, fil 1nvnoli)
- **RoxHype** [extrait] : « I've been using roxhype for about a month now and it's not bad, definitely a good price and the AI feature is cool. » https://www.reddit.com/r/HybridAthlete/comments/1xm9mhw/training_apps_roxhype_vs_haos_vs_the/. Le post scrapé n'avait encore aucun commentaire visible.
- **HAOS (Hunter McIntyre)** : seulement cité dans un titre (« McIntyre HAOS training reviews »). Aucun contenu vérifié.
- **Fergus Crawley** [extraits] : « Crawley, Klink and others are true hybrids » (https://www.reddit.com/r/crossfit/comments/15arh2g/hybrid_athlete_question_lifting_and_running/) et « Fergus Krawley, Some high intensity running, but mostly steady state longer jogs » (https://www.reddit.com/r/tacticalbarbell/comments/tsju1p/runningcardio_gurus/). Aucun avis sur un programme payant.
- **Plans de salle et volume** [extrait] : « Most Hyrox programs seem to push 40+ km per week » (https://www.reddit.com/r/hyrox/comments/1s5mvzr/what_would_you_want_in_a_12_week_training_program/).

---

## 4. S'entraîner et vivre à altitude modérée (~1800 m)

> **Thème faible côté Reddit** : je n'ai que des extraits, et aucun fil ne porte précisément sur 1800 m avec musculation et prise de masse. J'ajoute 2 à 3 repères scientifiques, **hors Reddit**, signalés comme tels.

**4.1 On sent la différence, sans que ce soit dramatique à ~1400–1800 m.** Consensus **Moyen**, extraits seulement.
- [extrait] r/Fitness « Is training at 4500 feet really that big of a difference » : « you will notice a difference but it won't be exponential. » https://www.reddit.com/r/Fitness/comments/8btfio/is_training_at_4500_feet_really_that_big_of_a/
- [extrait] r/crossfit « Working out at higher altitudes » : « You'll definitely need to respect the altitude difference. Try going for a jog a day or so before you work out to see the difference. » https://www.reddit.com/r/crossfit/comments/1m2c0sb/working_out_at_higher_altitudes/

**4.2 La force est peu ou pas pénalisée. L'endurance et l'intensité, si.** Consensus **Moyen**, extraits seulement.
- [extrait] r/powerlifting « Lifting at higher altitudes » : « going from training low to competing high altitude improves performance in strength and power sports. » https://www.reddit.com/r/powerlifting/comments/17up8vy/lifting_at_higher_altitudes/
- [extrait] r/askscience : « You cant train as hard at high altitude due to the lack of oxygen, and so you wont improve as fast as someone training at sea level. » https://www.reddit.com/r/askscience/comments/v60m2p/how_big_of_an_advantage_does_highaltitude/

**4.3 L'effet « camp d'altitude » est faible et lent.** Isolé, extrait seulement.
- [extrait] r/AdvancedRunning « Altitude Training?!?! » : « You need months more than weeks of uninterrupted time at altitude to see any meaningful effect, and the true net effect is slight. » https://www.reddit.com/r/AdvancedRunning/comments/viy5e6/altitude_training/
- Non lu : le récit d'un marathonien qui a régressé après un déménagement en altitude (https://www.reddit.com/r/AdvancedRunning/comments/z5jkxr/i_have_never_been_the_same_runner_since_moving/), et un fil sur le fait de « vivre et s'entraîner en altitude » pendant un job saisonnier en station (https://www.reddit.com/r/Velo/comments/a9a2q4/living_and_training_at_high_altitude/). Le second commence par « Don't waste your time on a trainer while you're doing a seasonal job in a mountain town… », mais la suite n'a pas été lue.

**Repères hors Reddit** (sources scientifiques, pour compléter) :
- Un stage de 3 semaines à 1800 m a augmenté la masse d'hémoglobine d'environ 3 % chez des coureurs élites. Le **statut en fer** est le principal facteur limitant de cette réponse : une carence en fer freine l'érythropoïèse en altitude modérée (https://pubmed.ncbi.nlm.nih.gov/31670602/ ; https://pmc.ncbi.nlm.nih.gov/articles/PMC6901429).
- L'altitude augmente le risque de déshydratation (air sec, pertes respiratoires). Il est conseillé de surveiller les urines et le poids du matin. Les besoins en macronutriments restent alignés sur ceux du niveau de la mer (https://www.gssiweb.org/docs/default-source/sse-docs/sse_altitudenutritionarticle_v3.pdf?sfvrsn=2).
- Je n'ai trouvé **aucune donnée spécifique sur la musculation** à cette altitude.

---

## 5. S'entraîner le matin quand on travaille tard le soir

> **Thème faible côté Reddit** : extraits seulement pour le sommeil. Le fil WHOOP sur l'alcool n'a pas été lu en entier.

**5.1 L'heure de la séance compte peu. La régularité du sommeil compte beaucoup.** Consensus **Moyen**, extraits seulement.
- [extrait] r/strengthlog « Irregular sleeping schedules effect on strength training » : « You get similar gains whether you work out in the morning or evening. » https://www.reddit.com/r/strengthlog/comments/1wyi5ns/irregular_sleeping_schedules_effect_on_strength/
- [extrait] r/gainit « Does sleeping/waking up at later hours affect gains? » : « the main takeaway is regularity and patterns of sleep are the way forward. » https://www.reddit.com/r/gainit/comments/m1u5c4/does_sleepingwaking_up_at_later_hours_affect_gains/
- [extrait] r/running « Dear morning runners » : « Make it a daily/regular wake time and your sleep time should gradually move earlier. » https://www.reddit.com/r/running/comments/og9yd2/dear_morning_runners/
- [extrait] r/StrongerByScience (horaires décalés) : la question posée est de savoir si des siestes permettent d'atteindre ~8 h cumulées. Les réponses n'ont pas été lues. https://www.reddit.com/r/StrongerByScience/comments/o2js8y/question_about_sleep_and_training_specifically/

**5.2 L'alcool est le premier destructeur de récupération sur WHOOP.** Consensus **Fort** dans r/whoop, sur plusieurs fils, mais en extraits.
- [extrait] Fil de recherche WHOOP sur l'alcool : « Even one drink was associated with: Higher resting heart rate overnight Lower heart rate [variability]… » https://www.reddit.com/r/whoop/comments/1syzh1v/whoop_research_what_alcohol_actually_does_to_your/ (voir aussi l'AMA d'un chercheur WHOOP : https://www.reddit.com/r/whoop/comments/1t3i3tn/im_greg_grosicki_phd_staff_research_scientist_at/)
- [extrait] « Stop drinking at least 2 hours before bed. Drink water… something with electrolytes is even better. » https://www.reddit.com/r/whoop/comments/16dwyg9/how_to_improve_recovery_score_on_the_days_after/
- [extrait] « Stopping alcohol is the greatest thing you can do for recovery IMO. Followed by hydration, eating 3 hours before bedtime… » https://www.reddit.com/r/whoop/comments/194yv5p/alcohol_free/
- [extrait] « It's hilarious how bad my recovery is if I drink at night after a solid weightlifting workout. » https://www.reddit.com/r/whoop/comments/1coo07d/does_whoop_make_you_question_drinking/

**5.3 Nutrition autour des séances** (fils lus en entier) : consensus **Moyen**.
- Fil 1kvx81i : un repas glucides + protéines entre deux séances (↑10). Une prise de protéines après une séance longue, et avant la course si elle suit une grosse séance de muscu (↑3).
- Fil 1friqut (↑1) : « My number one non negotiable is sticking to my macros and 8+ hours sleep. »
- Fil 1rd24y1 (OP) : une collation (yaourt grec, noix, fruit, shake protéiné) entre la Z2 du matin et la muscu qui suit.

---

## Structures de programme citées (attribuées à leur source)

**A. Hybride en prise de masse : Z2 et muscu le même matin** (auteur du post 1rd24y1, 42 ans, ↑171) https://www.reddit.com/r/HybridAthlete/comments/1rd24y1/42m_what_2_years_of_zone_2_did_to_my_lifting/
- Lun : Z2 sur tapis incliné, puis jambes, puis sauna
- Mar : Z2, collation, haut du corps
- Mer : Norwegian 4×4 (intervalles) + mobilité
- Jeu : haut du corps
- Ven : jambes
- Week-end : pas de structure (golf, tennis)
- Logique annoncée : 2 jours entre les jambes et les sprints dans les deux sens, pour limiter l'interférence.

**B. Prise de masse, version minimale** (1friqut, ↑1) https://www.reddit.com/r/HybridAthlete/comments/1friqut/what_is_your_bulking_training_like/
- 4 séances de muscu, 2 séances aérobies (1 d'environ 1 h, 1 de 30 à 45 min avec tempo), et éventuellement 1 à 2 metcons de 8 à 15 min en fin de séance.

**C. Macrocycle saisonnier** (1friqut, isolé)
- Hiver : prise de masse propre + cardio en maintien
- Printemps : force + hausse du cardio, calories de maintien
- Été : endurance musculaire, sèche légère
- Puis affûtage avant l'objectif.

**D. Bloc Hyrox de 12 semaines centré sur la faiblesse course** (1c6ta5n, ↑9) https://www.reddit.com/r/hyrox/comments/1c6ta5n/what_is_your_weekly_training_schedule_like_when/
- Lun : 10 km en Z2
- Mar : force (front squat, développé militaire, tractions) en 5×5 sur une progression de 3 semaines (75 %, 80 %, puis 85 % en 5×3), suivie de 10 à 20 min de circuit sur mouvements Hyrox
- Mer : piste, intervalles de 400 à 1200 m
- Jeu : repos (45 min de vélo de récupération + étirements)
- Ven : force (comme mardi)
- Sam : simulation Hyrox
- Dim : repos ou footing léger
- \+ 45 min de marche par jour. Environ 1 h par séance.

**E. Autres semaines Hyrox rapportées** (même fil)
- « 2 to 3 runs (long, interval, 5 km tempo) + 2 to 3 hyrox workouts » (↑5)
- « 3/4 strength sessions, 1 long run, 1 intervals/hill sprints, 2 hyrox classes » (↑5)
- Profil lourd (100 kg et plus) : 4 à 5 runs, 1 séance de force, 1 à 2 séances Hyrox (↑3)

**F. Profil muscu qui passe en prépa Hyrox** (1r5zfjw, ↑2) https://www.reddit.com/r/hyrox/comments/1r5zfjw/running_to_weight_training_ratio_for_hyrox/
- 2 séances de muscu en maintien, 1 séance d'intervalles (sprints/VO2), 1 à 2 séances HIIT, 1 sortie longue en Z2 de 5 à 8 km.

**G. Semaine d'un athlète en prise de muscle + Hyrox** (1f9xjng, ↑4)
- 4 séances de force, 2 séances Hyrox/compromised running, 1 sortie longue. Pesée quotidienne pour ajuster l'alimentation. D'autres membres lui conseillent 1 à 2 jours de repos.

**H. Force pour le Hyrox selon le coach « 6 years »** (1nvnoli, ↑46) https://www.reddit.com/r/hyrox/comments/1nvnoli/notes_and_advice_from_6_years_of_coaching_hyrox/
- 2 jours par semaine (3 si gros manque) : un jour de force absolue (squat ou front squat 3–5×5 à 75–80 %, bench ou développé militaire 3–5×5 à 75–80 %, tractions…) et un jour de force-endurance.

**I. Macro-blocs avant une course** (1tyivix, isolé)
- Base aérobie 8 semaines, puis seuil 8 à 12 semaines, puis affûtage sur les stations faibles.

---

## Erreurs fréquentes

1. **Ne pas faire de wall balls sous fatigue** : no-reps de profondeur et jambes qui lâchent. C'est l'erreur n°1 (↑63, fil 1wpcjzv).
2. **Partir trop vite sur le ski erg** (↑26) et faire des burpee broad jumps trop amples, ce qui fatigue les jambes pour les fentes et les runs (↑7).
3. **Surinvestir les stations au détriment de la course** (↑24 ; 1c6ta5n ; 1w5kkzo).
4. **Négliger le compromised running** : cardio qui « redline » à chaque station malgré de bons runs (1tyivix ; 1wpcjzv ↑14).
5. **Faire la Z2 trop vite** à cause de zones de montre fausses (formule 220 − âge). Plusieurs intervenants la font en réalité en Z3 (1rd24y1).
6. **Viser la progression en force ET en course en même temps** : « no gains in either » (1r5zfjw ; 1friqut).
7. **Manger trop peu quand le cardio augmente**, ce qui fait perdre du muscle. Même erreur que de vouloir sécher pour le Hyrox alors qu'on est déjà sec (1f9xjng ; 1r5zfjw).
8. **Copier des programmes d'influenceurs à très gros volume** (5 muscu + 5 runs, 10 à 12 séances par semaine) sans avoir leur temps ni leur récupération (1lgalbe ; 1qqcnn1 ; [extrait] 1dhxmoy).
9. **Pas de jour de repos** : burn-out rapporté après un an d'entraînement « HARD » (1f9xjng).
10. **Compter uniquement sur les séances de wall balls et de stations au lieu de construire la force des jambes** ([extrait] 1mkx67e ; 1nvnoli).

## Désaccords

- **Part de la force en prépa Hyrox.** D'un côté « 85 % course, les stations sont un piège à FC » (↑24) et « la force de base nécessaire est faible ». De l'autre, le coach du post 1nvnoli (↑46) juge la force « often neglected » et voit les coureurs purs « crumble… on the sleds ». La synthèse implicite : cela dépend du profil. Un profil force a surtout besoin de course et de force-endurance, pas de force maximale.
- **Peut-on vraiment prendre du muscle en faisant beaucoup de cardio ?** Oui si l'on mange assez (1f9xjng, 1rd24y1). Non, ou très lentement : les hybrides musclés ont d'abord construit leur masse, puis ajouté le cardio ([extraits] 1u7gxox, 1t2r7xy). Un intervenant à 1,6 g/kg n'y arrive pas.
- **Cardio le même jour que la muscu.** « Séparer de 5 à 6 h » (↑10) contre « du cardio à faible impact juste après la muscu n'a pratiquement aucun impact » (↑7).
- **Durée de prépa Hyrox.** De « un mois si bon coureur » (↑10) à « 6 mois pour approcher son potentiel », en passant par 12 semaines (↑4) et 3 mois (↑14).
- **Faut-il maigrir pour le Hyrox ?** Plusieurs disent non, le Hyrox ne pénalise pas le poids comme un marathon (1r5zfjw). D'autres ont séché pour améliorer course et burpees (1f9xjng, et [extrait] 1tw23uk).
- **Nick Bare et Viada.** Résultats jugés bons par certains (sélections militaires, templates intermédiaires solides), volume irréaliste et crédibilité contestée pour d'autres.

---

## Ce qui s'applique directement à Robin

1. **Déc. à mi-février (environ 10 semaines) : la masse progresse, le cardio reste en maintien.** Les 3 séances de muscu en surcharge progressive sont le cœur. Les 2 séances de Z2 doivent être vraiment conversationnelles, et de préférence à faible impact (vélo, rameur, ski erg, marche inclinée) plutôt qu'en course. La seule séance « intense » envisageable est une séance courte par semaine, et seulement si la récupération WHOOP suit. C'est cohérent avec le consensus le plus fort (1.2, 1.3).
2. **Créneau unique de 9h30 à 11h30 : séparer les séances de 5 à 6 h n'est pas possible.** Deux options sont citées par la communauté :
   - alterner les jours (muscu un jour, Z2 le suivant) ;
   - faire la Z2 à faible impact **après** la muscu dans la même séance (↑7).
   Il faut éviter les intervalles de course la veille d'une séance de jambes.
3. **Bloc spécifique Hyrox d'environ 8 semaines (mi-février à début avril)**, ce que la communauté juge suffisant avec une base de course correcte. Robin court déjà un 5 km en ~21:40.
   - Basculer vers 2 séances de muscu en maintien orientées force-endurance (fentes, sled ou équivalent, squats sous-maximaux).
   - Monter le volume de course.
   - Ajouter du compromised running : chaque séance se termine par des wall balls, et des runs sont enchaînés avec des fentes ou des wall balls.
   - Les tests tous les 15 jours peuvent inclure des sections partielles du Hyrox (méthode du « quart de course » citée en 1ltrm14).
4. **Manger en surplus et se peser régulièrement.** Le surplus doit couvrir le cardio : si le poids stagne avec 5 séances ou plus par semaine en altitude, ajouter des calories avant de réduire le cardio. En prépa Hyrox, ne pas chercher à sécher ; un léger gain de masse grasse est jugé acceptable.
5. **Altitude.** Pour Robin, cela veut dire : contrôler le fer avant la saison (repère hors Reddit), boire davantage et surveiller les urines et le poids du matin. Il faut s'attendre à des allures de Z2 et de tempo plus lentes les premières semaines et caler la Z2 sur la FC plutôt que sur l'allure. La force devrait être peu affectée.
6. **Sommeil et horaires.** Garder une heure de lever fixe malgré les fins de service tardives : la régularité est le point le plus répété. Viser 7 h 30.
7. **Alcool.** C'est le levier n°1 côté WHOOP. La communauté conseille au minimum d'arrêter de boire 2 h avant le coucher et d'éviter de boire les soirs qui suivent les grosses séances. C'est particulièrement critique en saison de station.
8. **Programmes du commerce.** Les retours Reddit poussent à adapter un template plutôt qu'à suivre à la lettre un programme d'influenceur à très gros volume. Pour Robin, cela veut dire 5 séances solides plutôt que 10 à 12.
9. **Profil CrossFit/force.** D'après le coach du post 1nvnoli, le manque de Robin sera plutôt la **force-endurance** et la course que la force maximale. Inutile de chercher des records de 1RM en prépa Hyrox.
