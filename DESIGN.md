# Forme — Spec design

Tableau de bord perso de suivi de la récup, de la charge et de la progression d'un athlète hybride
(CrossFit, Hyrox, ATHX, force). Type de projet : **dashboard, mode produit.**
Règle zéro : **la lisibilité des données gagne tous les conflits avec l'esthétique.**

## Brief

- **Personne** : Robin, consulte l'écran le matin, surtout sur mobile, pour décider de l'intensité du jour.
- **Promesse** : savoir comment tu vas avant de lire un chiffre, puis comprendre pourquoi en 10 secondes.
- **Piliers** : (1) l'état du jour d'abord, (2) cause → effet visible (charge ↔ récup), (3) zéro décoration, (4) base d'un futur agent coach IA (données propres et typées).
- **Contre** : les dashboards fitness colorés, les camemberts, la gamification, les dégradés génériques.

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

## Structure de l'écran

```
Desktop (12 col)                                   Mobile (390 px)
┌───────────────────────────────────────────┐      ┌──────────────┐
│ Robin | Date  [DÉMO]       sync · 7/30/90 │      │ Robin | Date │
├──────────┬────────────────────┬───────────┤      │ sync  [DÉMO] │
│ HRV      │                    │ Sommeil   │      │   (anneau)   │
│          │  Anneau de récup   │           │      │  ← jour →    │
│ FC repos │  ← jour →  zone    │ Strain    │      │ HRV │Sommeil │
├──────────┴───────┬────────────┴───────────┤      │ FC  │ Strain │
│ Charge semaine(5)│ Tendances (7)          │      │ Charge sem.  │
│ barres strain    │ HRV / FC repos / Somm. │      │ Tendances    │
│ KPI + empilée    │ (axe X partagé)        │      │  + 7/30/90 j │
├──────────────────┴─────┬──────────────────┤      │ Séances      │
│ Séances récentes (7)   │ Performances (5) │      │ Performances │
└────────────────────────┴──────────────────┘      └──────────────┘
```

- **Hero** : pas de carte, l'anneau flotte sur le halo. Les 4 tuiles se resserrent autour de l'axe de l'anneau.
- **Charge de la semaine** : semaine calendaire lundi → dimanche qui contient le jour sélectionné (cliquer une
  barre ne décale pas la fenêtre). Repères pointillés à 10 / 14 / 18 (zones de strain). Jours futurs = trait
  pointillé. Répartition par **temps** en barre empilée horizontale + légende alignée.
- **Tendances** : petits multiples sur le même axe X (alignement vertical = mêmes jours d'une métrique à
  l'autre). Trait plein = moyenne glissante 7 j (≥ 4 mesures sur 7), points = valeurs brutes, pointillé =
  moyenne 30 j du jour sélectionné. Axe uniquement sous le dernier graphique.
- **Séances** : liste, pas de cartes. Desktop = 5 colonnes ; mobile = 2 lignes (type + date / durée · strain · FC).
- **Performances** : structure du tableau présente même vide ; traits à la place des valeurs + encart pointillé
  qui explique ce qui manque.

## Patterns d'interaction

### Jour sélectionné = état global
`src/state/dashboard.tsx` porte `selected`, `range`, `hover`, `windowEnd`. **Tout** dérive de `selected` :
anneau, tuiles (écarts vs les 30 jours *précédant* ce jour), halo, semaine, séance surlignée, curseur des
courbes, date du header.

| Entrée | Action |
|---|---|
| `←` / `→` | jour précédent / suivant (borné aux données) |
| `Échap` | retour à aujourd'hui |
| Boutons ← → du hero (44 px) | idem |
| Swipe horizontal sur l'anneau (mobile) | gauche = jour suivant, droite = jour précédent |
| Clic sur une barre de strain | ce jour |
| Clic sur une courbe (n'importe où sur l'axe X) | jour le plus proche |
| Clic sur une séance | le jour de la séance |
| Bouton « Revenir à aujourd'hui » | apparaît dès qu'on quitte aujourd'hui |

Les flèches ne sont pas interceptées quand le focus est dans le sélecteur 7/30/90 (focus itinérant Radix).

### Fenêtre des tendances
La fenêtre 7/30/90 j se termine à aujourd'hui. Elle ne bouge **que** si le jour sélectionné en sort, façon
« scroll into view » avec une marge (1 / 3 / 7 j). Le domaine X est **interpolé** (pas re-rendu brutalement) :
toutes les courbes glissent ensemble ; le domaine Y suit. Le curseur du jour sélectionné est interpolé aussi.

### Survol lié entre graphiques
Le survol d'une courbe ou d'une barre fixe `hover` global : un trait fin + un point apparaissent sur **toutes**
les courbes, la barre correspondante s'éclaire. Seul le graphique sous le pointeur affiche le tooltip.

### Tooltip glass
Portail + `position: fixed`, mesuré puis borné : à droite du point, bascule à gauche si la place manque,
bornage à 12 px des bords. Toujours dans l'écran. Contenu : date, valeur, moyenne 7 j, écart vs moyenne
30 j (coloré), séance du jour ou « Jour sans séance ». Souris uniquement : au toucher, un tap sélectionne le
jour (c'est l'écran entier qui devient le tooltip).

### Chiffres animés
`AnimatedNumber` : valeur Motion + `useTransform` → jamais de saut sec. 0 → valeur au premier affichage
(calé sur la séquence de chargement), puis valeur → valeur (600 ms).

### Séquence de chargement (une seule fois)
Structure (fondu du verre) → anneau 0 → valeur (délai 150 ms, 900 ms, easing doux) → tuiles en stagger
(dès 500 ms, +70 ms) → barres qui montent et courbes qui se dessinent (dès 800 ms).
L'intro ne se joue **qu'une fois** : un composant remonté plus tard (redimensionnement) s'affiche directement.

### Mouvement réduit
`prefers-reduced-motion: reduce` → aucune animation (durée 0 partout, `MotionConfig reducedMotion="user"`,
swipe désactivé, skeleton non pulsé). Vérifié : toute la page est en place 150 ms après le chargement.

## États designés

| État | Rendu | Déclencheur de revue |
|---|---|---|
| Chargement | Skeleton glass calqué sur la vraie grille (aucun saut de layout), pulsation douce | `?state=loading` |
| Erreur de sync | Carte avec label d'erreur (rouge), message clair, détail technique en mono, « Réessayer » ; halo rouge faible ; header « sync échouée » | `?state=error` |
| Vide | Anneau vide « — » + explication de ce qui est attendu | `?state=empty` |
| Jour sans séance | Hero « jour sans séance » / « aucune séance pour l'instant » (aujourd'hui) ; liste : ligne dédiée en tête ; tooltip « Jour sans séance » | navigation |
| Bracelet non porté | Anneau masqué, « Non mesurée », halo gris, tuiles « — » | 4 sept. dans la démo |
| Cycle en cours (aujourd'hui) | Tuile strain « en cours », pas d'écart (un strain partiel vs une moyenne tromperait), valeur de référence affichée | aujourd'hui |
| Données de démo | Badge « DONNÉES DÉMO » dans le header + mention en pied de page | `demo: true` |

## Données

- `src/lib/data.ts` → `getData()` : **seul** point d'entrée. Lit `public/data/demo.json` aujourd'hui.
- `src/types/whoop.ts` : types bruts aux noms de colonnes WHOOP **exacts** + mapping → `DayMetrics`, `Workout`,
  `Performance`, `Dataset`. Les noms de colonnes bruts n'existent nulle part ailleurs.
- Un cycle WHOOP commence à l'endormissement : il est rattaché au **jour du réveil** (coucher après midi → lendemain).
- `Activity name` → catégorie via une table de règles (`Hyrox|ATHX`, `CrossFit|Functional Fitness|HIIT`, `Run…`, `Weight|Power…`, `Yoga|Mobility…`, sinon « Autre »).
- Démo : `npm run demo:generate` (déterministe). Modèle causal : le strain de la veille et la fatigue accumulée font baisser la HRV et monter la FC repos → récup ; un épisode de maladie, une semaine de décharge, un jour sans bracelet, des nuits courtes le week-end.
