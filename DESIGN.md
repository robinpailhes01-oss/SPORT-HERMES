# Forme — Spec design

Tableau de bord perso de suivi de la récup, de la charge et de la progression d'un athlète hybride
(CrossFit, Hyrox, ATHX, force). Type de projet : **dashboard, mode produit.**
Règle zéro : **la lisibilité des données gagne tous les conflits avec l'esthétique.**

## Brief

- **Personne** : Robin, athlète hybride, consulte l'écran le matin sur mobile. Ne lit pas la HRV : il veut savoir quoi faire et voir qu'il progresse.
- **Objectif de la saison** : prise de masse cet hiver (1 800 m, travail l'après-midi et tard le soir), plan de 90 jours en blocs, tests tous les 15 jours, puis Hyrox solo chronométré au printemps.
- **Promesse** : un verdict en une phrase le matin, une to-do de la semaine qu'on coche d'un tap, la progression visible.
- **Piliers** : (1) verdict avant les chiffres, (2) le plan pilote la semaine, (3) progression en vedette, (4) uniquement des faits tirés des données (pas de points, pas de badges), (5) base propre pour le coach IA.
- **Contre** : le jargon physiologique en façade, la gamification artificielle, les données inventées.

## Direction artistique

**« La sobriété data d'un tracker de récupération + les surfaces en verre de visionOS. »**
Fond quasi noir et profond ; surfaces en verre qui laissent passer la lumière ambiante ; la couleur
est réservée au sens (récup, charge, sommeil). On reprend la *logique* WHOOP (zones de récup,
strain 0–21), pas sa marque : ni logo, ni nom, ni visuel repris.

## Élément signature

**Le halo de récupération.** Un grand halo flou (`blur(110px)`, opacité 17 %) fixé derrière toute la page,
dont la couleur suit la récup du jour sélectionné : vert ≥ 67, jaune 34–66, rouge ≤ 33, gris si non
mesuré. Il fond d'une couleur à l'autre (1,2 s) au changement de jour. C'est l'élément le plus
audacieux de l'écran ; tout le reste reste calme autour.

## Tokens

Source unique : `src/index.css` (`@theme`, Tailwind v4). Miroir JS pour Motion et le SVG : `src/lib/tokens.ts`.
**Toute modification se fait aux deux endroits.**

### Couleur

| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#07090C` | fond de page |
| `text` | `#F2F4F7` | texte principal, moyennes 7 j HRV / FC repos |
| `muted` | `#8A93A3` | texte secondaire, axes, labels |
| `faint` | `#5D6574` | graduations Y secondaires uniquement (jamais de texte essentiel) |
| `line` | `rgba(255,255,255,.08)` | bordures verre, lignes de base d'axe |
| `hairline` | `rgba(255,255,255,.05)` | séparateurs de liste, repères discrets |
| `glass` | `rgba(255,255,255,.04)` | fond des cartes |
| `rec-high` | `#2EE59D` | récup haute, écarts favorables |
| `rec-mid` | `#F5C542` | récup modérée |
| `rec-low` | `#FF4D5E` | récup basse, écarts défavorables, erreur de sync |
| `strain` | `#3DA5FF` | strain / charge (barres, valeurs, répartition des séances) |
| `sleep` | `#8E9BFF` | sommeil (courbe, jauge de performance) |

Règles couleur :
- La couleur ne porte **que** du sens. Les types de séance se distinguent par des **paliers
  d'opacité de la seule teinte strain** (100 / 74 / 52 / 34 / 20 %), pas par de nouvelles couleurs.
- Les points bruts HRV et FC repos sont teintés par la **zone de récup du jour** : couleur = information.
- Un écart vs moyenne 30 j est vert s'il est favorable, rouge s'il est défavorable, gris si |Δ| < 3 %,
  s'il s'arrondit à zéro (« ≈ moy. 30 j ») ou si la métrique n'a pas de sens favorable (strain).

### Typographie

| Rôle | Police | Réglages |
|---|---|---|
| Gros chiffres (`.display-num`) | Archivo Variable | `font-stretch: 125%`, graisse 700, `letter-spacing: -0.025em`, `tabular-nums` |
| Texte | Inter Variable | 13–15 px, graisse 400/500/600 |
| Petites données, axes, labels (`.mono`, `.label`) | JetBrains Mono Variable | 10–12 px, `tabular-nums` ; `.label` = 11 px capitales, +0,06em |

Polices **auto-hébergées** (`@fontsource-variable/*`) : aucune dépendance à Google une fois sur le VPS.

Échelle des chiffres : anneau 78 px (desktop) / 60 px (mobile) · tuiles 36 / 30 px · valeurs tendances 22 / 17 px · KPI 20 px.
Formatage français partout (`14,8`, `7h32`, `1 h 07`).

### Espacement, grille, rayons, élévation

- Base 4 px (échelle Tailwind). Gouttières entre blocs : 24 px desktop / 12 px mobile. Padding carte 24 / 16 px.
- Desktop : conteneur 1320 px max, grille **12 colonnes**. Mobile : gouttière latérale 16 px.
- **Rayon plafond 20 px** (cartes). Contrôles 10 px, chips 6 px, tooltips 14 px.
- **Aucune ombre portée.** Élévation = verre + bordure 1 px + reflet haut (`inset 0 1px 0 rgba(255,255,255,.06)` + dégradé de 88 px).

### Verre (`.glass`)

```css
background: rgba(255,255,255,.04);
backdrop-filter: blur(24px) saturate(140%);
border: 1px solid rgba(255,255,255,.08);
border-radius: 20px;
box-shadow: inset 0 1px 0 rgba(255,255,255,.06); /* reflet, pas une ombre */
```

### Motion

| Token | Valeur | Usage |
|---|---|---|
| `ease.out` | `cubic-bezier(.16,1,.3,1)` | transitions standard |
| `ease.soft` | `cubic-bezier(.33,1,.68,1)` | remplissage de l'anneau |
| `micro` | 120 ms | survol, opacité |
| `base` | 240 ms | déplacement du surlignage / curseur de jour |
| `value` | 600 ms | chiffres et couleurs au changement de jour |
| `range` | 550 ms | passage 7 / 30 / 90 j |
| `ring` | 900 ms | remplissage initial de l'anneau |
| `halo` | 1,2 s | fondu de couleur du halo |

## Hiérarchie de l'écran (session 2)

Ordre de lecture = ordre d'usage le matin.

```
Desktop (12 col)                                     Mobile (390 px)
┌─────────────────────────────────────────────┐      ┌───────────────┐
│ Robin | Date               sync · [DÉMO]    │      │ Robin | Date  │
├──────────┬──────────────────────┬───────────┤      │   (anneau)    │
│ Anneau   │ VERDICT (phrase)     │ Sommeil   │      │   ← jour →    │
│ ← jour → │ charge conseillée    │ vs 7h30   │      │   VERDICT     │
│          │ séance conseillée    │ Régularité│      │ charge/séance │
├──────────┴──── Pourquoi ce score ? ─────────┤      │ Somm.│Régul.  │
│ Semaine n/13 — TO-DO (7)  │ Ce soir (5)     │      │ TO-DO semaine │
│ ○ séances du plan         │ ○ ○ ○           │      │ Ce soir       │
│ test de la semaine        │ Objectifs + série│      │ Objectifs     │
├───────────────────────────┴─────────────────┤      │ Plan 90 j     │
│ PLAN 90 JOURS : J-52 fin · J-80 Hyrox solo  │      │ Performances  │
│ frise des blocs, tests J1…J90, aujourd'hui  │      │ Poids         │
├───────────────────────────┬─────────────────┤      │ Sommeil       │
│ Performances (7)          │ Poids (5)       │      │ Charge        │
├───────────────────────────┼─────────────────┤      │ Leviers       │
│ Sommeil 30 nuits (7)      │ Charge (5)      │      │ Jalons        │
├───────────────────────────┼─────────────────┤      └───────────────┘
│ Leviers (7)               │ Jalons (5)      │
└───────────────────────────┴─────────────────┘
```

- **Verdict** : zone de récup → une phrase + une charge conseillée (vert : strain 14–18, jaune : 10–14, rouge : < 10) + la
  première séance non cochée de la semaine qui convient (rouge → zone 2 / mobilité ; vert → force). Jour de test : liste des tests.
  HRV, pouls au repos, respiration et durée de sommeil sont **repliés** dans « Pourquoi ce score ? », traduits en mots
  (« mieux que ta normale ») avec la valeur en petit.
- **To-do de la semaine** : les séances de la semaine du plan qui contient le jour sélectionné, sans jour imposé.
  Compteur `n/5` + jauge segmentée (verte quand l'objectif est atteint). Tests de la semaine en encart.
  États : avant le plan (aperçu non cochable de la semaine 1 + « commence dans N jours »), plan terminé, aucun plan.
- **Ce soir** : 3 cases (protéines, boisson de récup / pas d'alcool, coucher avant l'heure cible du plan). Pour un soir passé,
  l'heure d'endormissement réelle WHOOP s'affiche à côté (verte si avant la cible).
- **Objectifs de la semaine** : séances `n/5`, nuits ≥ 7 h 30 (une case par jour, rouge si ratée), soirées 3/3, et la
  **série** de semaines réussies (≥ 5 séances). La semaine en cours ne casse pas la série tant qu'elle n'est pas finie.
- **Plan 90 jours** : J- fin du plan et J- échéance (date fournie par le plan), frise des blocs remplie jusqu'à aujourd'hui,
  tests en jalons cliquables (plein = fait), losange de l'échéance après le plan, prochain test.
- **Performances** : par repère : départ (estimation « à confirmer » tant que le 1er test n'est pas fait, puis 1er résultat),
  dernier test, mini-courbe (mieux = vers le haut, y compris pour un chrono), progrès coloré. Résultats futurs jamais affichés.
- **Poids** : pesées (points), moyenne 7 j (trait), couloir visé depuis le départ (`gainPerWeekKg` du plan), rythme sur
  21 jours → « dans la cible / trop lent / trop rapide ». Saisie : un tap sur le bouton, clavier numérique, Entrée.
- **Sommeil** : 30 nuits face à la cible (pointillé), nuits ratées atténuées, régularité, dette, et l'écart de récup mesuré
  sur TES données après une nuit < 7 h.
- **Charge** : strain de la semaine + **zone de progression** (moyenne 7 j / moyenne 28 j : < 0,8 maintien, 0,8–1,3
  progression, 1,3–1,5 vigilance, > 1,5 surcharge). Aucune répartition par type : 44 % des séances WHOOP sont « Activité ».
- **Leviers** : pour chaque question du journal WHOOP, récup moyenne les jours « oui » − jours « non », triée par impact,
  barre divergente centrée sur 0, nombre de jours de chaque côté. Minimum 8 jours de chaque côté, sinon listé à part.
  Plus un levier calculé sans journal : « nuit ≥ 7 h 30 ». Phrase de tête : « Levier n°1 : alcool, −23 points ».
- **Jalons** : séries de semaines (en cours, record), plus grosse semaine des 3 derniers mois, meilleure série de nuits
  ≥ cible, records aux tests (le plus récent par repère). Rien d'inventé, rien qui dépende du type de séance WHOOP.

## Interactions

| Geste | Effet |
|---|---|
| Tap sur une séance / une case du soir | coché ↔ décoché (ressort sur la coche, tracé du ✓) |
| Appui long 450 ms (ou touche `N`) sur une séance | note facultative (vibration légère), sans cocher |
| Tap sur le bouton du poids | champ numérique (`inputmode=decimal`), Entrée pour valider, « Effacer » si déjà saisi |
| ← / → · Échap | jour précédent / suivant · aujourd'hui (les champs de saisie gardent leurs touches) |
| Swipe sur l'anneau (mobile) | change de jour |
| Clic sur un jour (barres, nuits, test, record) | recale tout l'écran sur ce jour |

**Jour sélectionné = état global** : verdict, to-do (semaine du jour), checklist du soir, objectifs, curseurs des graphiques,
halo. Cocher en consultant un jour passé enregistre ce jour comme date de réalisation (rattrapage facile).

## États designés

| État | Rendu | Revue |
|---|---|---|
| Chargement | skeleton verre | `?state=loading` |
| Erreur de sync | carte d'erreur + Réessayer, halo rouge faible | `?state=error` |
| Aucune donnée | anneau vide + explication | `?state=empty` |
| Avant le plan | to-do en aperçu non cochable, J- jusqu'au début | `?asof=2026-11-20` |
| Rejouer un jour passé | l'app se comporte comme ce jour-là | `?asof=YYYY-MM-DD` |
| Forcer la démo | ignore tes CSV | `?source=demo` |
| Colonnes WHOOP non reconnues | ligne d'alerte jaune en pied de page + tableau en console (dev) | automatique |
| Pas de pesée / pas de plan / journal trop court | encarts pointillés qui disent quoi faire | automatique |
| Données ou plan de démo | badges « DONNÉES DÉMO » / « PLAN DÉMO » + pied de page | automatique |

## Données

### WHOOP — `src/lib/data.ts` (seul fichier qui connaît les en-têtes bruts)
- Lit `data/physiological_cycles.csv`, `data/sommeil.csv`, `data/entraînements.csv` (NFC, NFD macOS ou sans accent),
  `data/journal_entries.csv`. Si absent → `data/demo/…` et badge démo.
- En-têtes normalisés : BOM retiré, accents retirés, **espaces insécables → espace**, minuscules. Chaque champ propre a
  une liste de noms exacts (FR + EN) puis un motif de repli (`not` exclut « sommeil léger/profond » pour la durée).
- Valeurs : virgule décimale acceptée, booléens `true/vrai/oui/1`, dates `YYYY-MM-DD HH:MM` ou `JJ/MM/AAAA HH:MM`.
- Jointures sur « Heure de début du cycle » (minute près) : sommeil principal (siestes ignorées) et journal → cycle.
- Un cycle est rattaché au **jour du réveil**.

### Plan — `public/data/plan.json` + `public/data/plan.schema.json`
Écrit par le coach IA. Aucune séance n'est codée dans l'app. Types : `src/types/plan.ts`.

### Saisies de Robin — `src/lib/plan.ts`
Cases, notes, checklist du soir, pesées passent par **un seul** hook (`useTracking`) et **une seule** couche de persistance
(`Persistence.load/save`, aujourd'hui `localStorage`). Pour brancher l'API : remplacer ces deux fonctions.
Règle de fusion : saisie locale > état écrit dans le plan ; une séance datée après aujourd'hui ne compte jamais comme faite.
