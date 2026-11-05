// Génère les DONNÉES DE DÉMO, au format exact de l'export WHOOP en français :
//   public/data/demo/physiological_cycles.csv
//   public/data/demo/sommeil.csv
//   public/data/demo/entraînements.csv
//   public/data/demo/journal_entries.csv
//   public/data/demo/tracking.json   (pesées + checklist du soir saisies dans l'app)
//   public/data/plan.json            (plan 90 jours — exemple, écrit plus tard par le coach IA)
//
// Tout est fictif mais causal : la charge de la veille, le sommeil, l'alcool, etc. font bouger
// la récup ; les séances cochées du plan correspondent aux entraînements WHOOP ; la pesée suit
// la prise de masse. Déterministe : `npm run demo:generate`.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_DIR = resolve(ROOT, "public/data/demo");

// ─── calendrier ───
const START = "2025-11-12"; // ~14 mois d'historique
const END = "2027-01-13"; // « aujourd'hui » de la démo : mercredi, semaine 6 du plan
const PLAN_START = "2026-12-07"; // lundi
const PLAN_DAYS = 90;
const ALTITUDE_FROM = "2026-12-01"; // saison d'hiver à 1 800 m
const HYROX_DATE = "2027-04-03";
const SYNC = "07:41:09";
const BEDTIME_TARGET = 23 * 60 + 45; // 23:45

// ─── RNG ───
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(90_2026);
const uni = (a, b) => a + (b - a) * rand();
const chance = (p) => rand() < p;
const gauss = (sd = 1) => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand()) * sd;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;
const pad = (n) => String(n).padStart(2, "0");

const ord = (d) => { const [y, m, dd] = d.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, dd) / 864e5); };
const day = (o) => { const t = new Date(o * 864e5); return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`; };
const dow = (d) => new Date(ord(d) * 864e5).getUTCDay(); // 0 = dimanche
/** horodatage local "YYYY-MM-DD HH:MM:SS" à partir d'un jour + minutes (peut déborder) */
function ts(d, minutes) {
  const shift = Math.floor(minutes / 1440);
  const m = minutes - shift * 1440;
  return `${day(ord(d) + shift)} ${pad(Math.floor(m / 60))}:${pad(Math.floor(m % 60))}:${pad(Math.floor(rand() * 60))}`;
}

// ─── CSV ───
const NBSP = " ";
function csv(cols, rows) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(esc).join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

const SLEEP_FIELDS = [
  "Heure d'endormissement", "Heure de réveil", "Performance du sommeil %", "Fréquence respiratoire (rpm)",
  "Durée de sommeil (min)", "Durée au lit (min)", "Durée de sommeil léger (min)",
  "Durée de sommeil profond (SLP) (min)", "Durée du sommeil paradoxal (min)", "Durée d'éveil (min)",
  "Besoin de sommeil (min)", "Dette de sommeil (min)", "Efficacité du sommeil %", "Régularité du sommeil %",
];
const CYCLE_HEAD = ["Heure de début du cycle", "Heure de fin du cycle", "Fuseau horaire du cycle"];
const CYCLE_COLS = [
  ...CYCLE_HEAD, "Score de récupération %", "Fréquence cardiaque au repos (bpm)",
  "Variabilité de la fréquence cardiaque (ms)", "Température cutanée (celsius)", "Oxygène sanguin %",
  "Effort du jour", "Énergie dépensée (cal)", "FC max (bpm)", "FC moyenne (bpm)", ...SLEEP_FIELDS,
];
const SLEEP_COLS = [...CYCLE_HEAD, ...SLEEP_FIELDS, "Sieste"];
const WORKOUT_COLS = [
  ...CYCLE_HEAD, "Heure de début de l'entraînement", "Heure de fin de l'entraînement", "Durée (min)",
  "Nom de l'activité", "Effort de l'activité", "Énergie dépensée (cal)", "FC max (bpm)", "FC moyenne (bpm)",
  ...[1, 2, 3, 4, 5].map((z) => `Zone FC ${z}${NBSP}%`), "GPS activé",
];
const JOURNAL_COLS = [...CYCLE_HEAD, "Texte de la question", "Réponse oui", "Notes"];

// questions du journal + effet (points de récup) + probabilité de « oui » hors plan / pendant le plan
const QUESTIONS = [
  { q: "Avez-vous bu de l'alcool ?", fx: -12, pre: 0.2, plan: 0.04 },
  { q: "Vous êtes-vous bien hydraté ?", fx: 5, pre: 0.55, plan: 0.75 },
  { q: "Avez-vous pris du magnésium ?", fx: 3, pre: 0.25, plan: 0.8 },
  { q: "Avez-vous mangé suffisamment de protéines ?", fx: 2.5, pre: 0.45, plan: 0.85 },
  { q: "Avez-vous consommé de la caféine en fin de journée ?", fx: -7, pre: 0.25, plan: 0.12 },
  { q: "Avez-vous utilisé un écran au lit ?", fx: -4, pre: 0.55, plan: 0.35 },
  { q: "Avez-vous lu avant de dormir ?", fx: 2, pre: 0.2, plan: 0.35 },
];

// ─── plan : séances types (3 force/hypertrophie + 2 zone 2) ───
function planSessions(w) {
  const sq = 65 + 2.5 * Math.floor((w - 1) / 2);
  const bp = 50 + 2.5 * Math.floor((w - 1) / 2);
  const cl = 55 + 2.5 * Math.floor((w - 1) / 3);
  const z2 = Math.min(75, 40 + 3 * (w - 1));
  return [
    { key: "fa", title: "Force A — Bas du corps", type: "force", detail: `Back squat 5×5 @ ${sq} kg · SDT roumain 4×8 · Fentes bulgares 3×10` },
    { key: "fb", title: "Force B — Haut du corps", type: "force", detail: `Développé couché 5×5 @ ${bp} kg · Rowing barre 4×8 · Dips lestés 3×8` },
    { key: "hy", title: "Hypertrophie — Full body", type: "hypertrophie", detail: `Clean 6×2 @ ${cl} kg · Front squat 4×8 · Tractions 4×max · Militaire 3×10` },
    { key: "z1", title: `Zone 2 — ${z2} min`, type: "zone2", detail: "Course ou ski de rando · FC 130–145 · respiration nasale" },
    { key: "z2", title: `Zone 2 — ${z2 + 15} min`, type: "zone2", detail: "Vélo ou ski de rando · FC 130–145 · allure conversation" },
  ];
}
// jour de la semaine (0 = lundi) prévu pour chaque séance — l'ordre réel varie
const DEFAULT_DAYS = { fa: 0, z1: 1, fb: 2, hy: 4, z2: 5 };
const BLOCKS = [
  { id: "b1", name: "Masse · Fondations", goal: "Installer le volume, technique propre, s'acclimater à l'altitude.", weeks: [1, 4] },
  { id: "b2", name: "Masse · Volume", goal: "Monter le volume utile : plus de séries, charges en hausse chaque semaine.", weeks: [5, 9] },
  { id: "b3", name: "Masse · Intensification", goal: "Charges lourdes, volume stable, préparer les tests finaux.", weeks: [10, 13] },
];
const BENCHMARKS = [
  { id: "squat-3rm", label: "Back squat 3RM", unit: "kg", better: "higher", baseline: { value: 80, estimated: true, display: "80 kg" } },
  { id: "clean", label: "Clean", unit: "kg", better: "higher", baseline: { value: 80, estimated: true, display: "80 kg" } },
  { id: "bench-60", label: "Développé couché 60 kg", unit: "reps", better: "higher", baseline: { value: 7, estimated: true, display: "7 à 10 reps" } },
  { id: "run-5k", label: "5 km", unit: "s", better: "lower", baseline: { value: 1300, estimated: true, display: "≈ 21:40 (4:20/km)" } },
  { id: "hyrox", label: "Hyrox solo", unit: "s", better: "lower", baseline: null },
];
// tests tous les 15 jours (J1, J15, J30…) — résultats de démo sur les tests passés
const TEST_DAYS = [0, 14, 29, 44, 59, 74, 89];
const TEST_PROGRAM = [
  ["squat-3rm", "clean", "bench-60", "run-5k"],
  ["squat-3rm", "bench-60"],
  ["squat-3rm", "clean", "bench-60", "run-5k"],
  ["squat-3rm", "clean", "bench-60"],
  ["squat-3rm", "clean", "bench-60", "run-5k"],
  ["squat-3rm", "bench-60"],
  ["squat-3rm", "clean", "bench-60", "run-5k"],
];
const TEST_RESULTS = {
  0: { "squat-3rm": 82.5, clean: 77.5, "bench-60": 9, "run-5k": 1325 },
  1: { "squat-3rm": 85, "bench-60": 10 },
  2: { "squat-3rm": 87.5, clean: 80, "bench-60": 11, "run-5k": 1301 },
};

// ─── simulation ───
const days = [];
for (let o = ord(START); o <= ord(END); o++) days.push(day(o));
const planStartO = ord(PLAN_START);
const todayO = ord(END);

// séances réalisées du plan : semaine → [{key, date}]
const planDone = new Map();
// préparer pour chaque semaine passée/en cours un calendrier de réalisation
for (let w = 1; w <= 13; w++) {
  const monday = planStartO + (w - 1) * 7;
  if (monday > todayO) break;
  const keys = Object.keys(DEFAULT_DAYS);
  const skipped = w === 3 ? ["z2"] : w === 5 && chance(0.5) ? ["hy"] : []; // semaine 3 : 4/5 (Noël)
  const done = [];
  for (const k of keys) {
    if (skipped.includes(k)) continue;
    let d = DEFAULT_DAYS[k] + (chance(0.3) ? (chance(0.5) ? 1 : -1) : 0);
    d = clamp(d, 0, 6);
    if (k === "fa" && w === 1) d = 1; // J1 = test, la Force A glisse au mardi
    done.push({ key: k, date: day(monday + d) });
  }
  planDone.set(w, done.filter((x) => ord(x.date) < todayO)); // aujourd'hui : rien encore (sync du matin)
}
const planWorkoutsByDate = new Map();
for (const [w, list] of planDone) for (const s of list) {
  const arr = planWorkoutsByDate.get(s.date) ?? [];
  arr.push({ ...s, week: w });
  planWorkoutsByDate.set(s.date, arr);
}

const SESSION_PROFILE = {
  fa: { strain: [10.5, 12.6], hr: [118, 128], max: [158, 170], dur: [70, 85], names: ["Musculation"] },
  fb: { strain: [9.2, 11.4], hr: [112, 122], max: [150, 162], dur: [65, 80], names: ["Musculation"] },
  hy: { strain: [11.6, 13.8], hr: [124, 136], max: [165, 178], dur: [70, 85], names: ["Musculation", "Haltérophilie"] },
  z1: { strain: [9.6, 11.4], hr: [134, 142], max: [150, 158], dur: [40, 80], names: ["Course à pied", "Ski de randonnée"] },
  z2: { strain: [10.2, 12.2], hr: [133, 141], max: [148, 156], dur: [55, 95], names: ["Ski de randonnée", "Vélo"] },
};
const PRE_PLAN = {
  1: [["crossfit", 1]], 2: [["run", 0.9]], 3: [["strength", 0.85]], 4: [["hyrox", 0.9]],
  5: [["crossfit", 0.6]], 6: [["long", 0.85]], 0: [["mobility", 0.35]],
};
const PRE_PROFILE = {
  crossfit: { strain: [12.8, 15.6], hr: [146, 156], max: [178, 189], dur: [55, 70], names: ["CrossFit"] },
  hyrox: { strain: [14.2, 17.0], hr: [152, 163], max: [182, 192], dur: [60, 78], names: ["HYROX"] },
  run: { strain: [11.4, 14.2], hr: [150, 160], max: [178, 188], dur: [42, 55], names: ["Course à pied"] },
  long: { strain: [12.2, 15.2], hr: [143, 152], max: [166, 178], dur: [68, 95], names: ["Course à pied", "HYROX"] },
  strength: { strain: [8.2, 11.2], hr: [112, 126], max: [152, 168], dur: [58, 78], names: ["Musculation"] },
  mobility: { strain: [2.8, 5.2], hr: [86, 98], max: [104, 118], dur: [28, 42], names: ["Yoga"] },
};

const cycles = [], sleeps = [], workouts = [], journal = [];
const tracking = { weights: {}, evening: {} };
let atl = 11, ctl = 11, prevStrain = 11, wellness = 0, debt = 30;
const bedHist = [], wakeHist = [];
let weightKg = 76.8;
const answersByDay = new Map();
const bedtimeByDay = new Map();

for (let i = 0; i < days.length; i++) {
  const d = days[i];
  const o = ord(d);
  const inPlan = o >= planStartO;
  const progress = i / (days.length - 1);
  const baseHrv = 64 + 9 * progress;
  const baseRhr = 51 - 3.5 * progress;
  const altO = ord(ALTITUDE_FROM);
  const alt = o >= altO ? Math.exp(-(o - altO) / 9) : 0; // acclimatation
  const altRhr = o >= altO ? 1 : 0;
  const isToday = o === todayO;

  // journal (soirée de la veille → ce cycle)
  const answered = chance(0.86);
  const weekendNight = dow(d) === 6 || dow(d) === 0;
  const ans = {};
  for (const Q of QUESTIONS) {
    let p = inPlan ? Q.plan : Q.pre;
    if (Q.fx < -15 && !inPlan) p = weekendNight ? 0.48 : 0.09;
    ans[Q.q] = chance(p);
  }
  answersByDay.set(d, ans);
  const alcohol = ans[QUESTIONS[0].q];
  const effect = QUESTIONS.reduce((acc, Q) => acc + (ans[Q.q] ? Q.fx : 0), 0) + gauss(2);

  // coucher / sommeil
  let bed = (inPlan ? -8 : 18) + gauss(inPlan ? 24 : 36) + (alcohol ? 42 : 0) + (weekendNight && !inPlan ? 25 : 0);
  bed = Math.round(bed); // minutes autour de minuit (négatif = avant minuit)
  let asleep = 438 + gauss(30) + (inPlan ? 8 : 0) - (alcohol ? 32 : 0) - (ans[QUESTIONS[5].q] ? 10 : 0) + (prevStrain > 16 ? 12 : 0);
  asleep -= alt * 25;
  if (weekendNight && !inPlan && chance(0.35)) asleep -= uni(40, 80);
  asleep = Math.round(clamp(asleep, 290, 560));
  const awake = Math.round(uni(18, 42));
  const inBed = asleep + awake;
  const wake = bed + inBed;
  bedtimeByDay.set(d, bed);
  const needBase = 470 + 7 * (prevStrain - 10);
  const need = Math.round(needBase + debt * 0.5);
  const sleepPerf = clamp(Math.round((asleep / need) * 100), 40, 100);
  debt = clamp(0.55 * debt + 0.6 * Math.max(0, needBase - asleep), 0, 190);
  bedHist.push(bed); wakeHist.push(wake);
  const recentBed = bedHist.slice(-5, -1), recentWake = wakeHist.slice(-5, -1);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
  const consistency = recentBed.length
    ? clamp(Math.round(100 - ((Math.abs(bed - mean(recentBed)) + Math.abs(wake - mean(recentWake))) / 2) * 0.9), 35, 99)
    : 80;

  // physiologie
  const fatigue = Math.max(0, atl - ctl);
  wellness = 0.75 * wellness + gauss(0.03);
  let hrv = baseHrv * (1 - 0.013 * (prevStrain - 11)) * (1 - 0.025 * fatigue) * (1 + 0.003 * (sleepPerf - 85)) * (1 + wellness + gauss(0.035)) * (1 + effect * 0.004) * (1 - 0.1 * alt);
  let rhr = baseRhr + altRhr + 3 * alt + 0.24 * (prevStrain - 11) + 0.25 * fatigue - 0.04 * (sleepPerf - 85) - 18 * wellness - effect * 0.05 + gauss(0.8);
  const resp = r1(15.1 + gauss(0.2) + 0.9 * alt + 0.3 * altRhr + (alcohol ? 0.3 : 0));
  let recovery = 66 + 135 * (hrv / baseHrv - 1) - 2.4 * (rhr - baseRhr) + 0.3 * (sleepPerf - 85) + effect * 0.55 + gauss(3.5);
  if (asleep < 420) recovery -= 9; // sous 7 h, la récup chute
  recovery = clamp(Math.round(recovery), 3, 99);

  // séances du jour
  const dayWorkouts = [];
  if (!isToday) {
    if (inPlan) {
      for (const s of planWorkoutsByDate.get(d) ?? []) dayWorkouts.push({ prof: SESSION_PROFILE[s.key], morning: true });
    } else {
      for (const [k, p] of PRE_PLAN[dow(d)] ?? []) if (chance(p)) dayWorkouts.push({ prof: PRE_PROFILE[k], morning: chance(0.5) });
    }
  }
  const strains = [];
  for (const w of dayWorkouts) {
    const P = w.prof;
    const dur = Math.round(uni(...P.dur));
    const strain = r1(clamp(uni(...P.strain) * (recovery < 34 ? 1.05 : 1), 1, 20.5));
    const avg = Math.round(uni(...P.hr));
    const max = Math.round(Math.max(avg + 12, uni(...P.max)));
    const startMin = w.morning ? Math.round(uni(9 * 60 + 10, 11 * 60 + 20)) : Math.round(uni(18 * 60, 19 * 60 + 30));
    const name = chance(0.44) ? "Activité" : P.names[Math.floor(rand() * P.names.length)];
    // zones FC grossières selon la FC moyenne
    const hi = clamp((avg - 110) / 60, 0, 1);
    const z = [0.25 - 0.2 * hi, 0.35 - 0.15 * hi, 0.25, 0.1 + 0.2 * hi, 0.05 + 0.15 * hi].map((v) => Math.max(0, v + gauss(0.02)));
    const zs = z.reduce((a, b) => a + b, 0);
    strains.push(strain);
    const row = {
      "Heure de début de l'entraînement": ts(d, startMin),
      "Heure de fin de l'entraînement": ts(d, startMin + dur),
      "Durée (min)": dur,
      "Nom de l'activité": name,
      "Effort de l'activité": strain,
      "Énergie dépensée (cal)": Math.round(dur * (avg - 62) * 0.128 + gauss(18)),
      "FC max (bpm)": max,
      "FC moyenne (bpm)": avg,
      "GPS activé": /Course|Ski|Vélo/.test(name) ? "true" : "false",
    };
    z.forEach((v, k) => (row[`Zone FC ${k + 1}${NBSP}%`] = Math.round((v / zs) * 100)));
    workouts.push({ row, d });
  }
  const bg = 6.4 + gauss(1.1);
  let dayStrain = Math.sqrt(strains.reduce((a, s) => a + s * s, 0) + bg * bg);
  if (isToday) dayStrain = 2.9;
  dayStrain = r1(clamp(dayStrain, 0.5, 20.9));

  const cycleStart = ts(d, bed);
  const cycleEnd = isToday ? "" : ts(d, bed + 1440);
  const head = { "Heure de début du cycle": cycleStart, "Heure de fin du cycle": cycleEnd, "Fuseau horaire du cycle": "UTC+01:00" };
  const deep = Math.round(asleep * uni(0.17, 0.23)), rem = Math.round(asleep * uni(0.2, 0.26));
  const sleep = {
    "Heure d'endormissement": cycleStart,
    "Heure de réveil": ts(d, wake),
    "Performance du sommeil %": sleepPerf,
    "Fréquence respiratoire (rpm)": resp,
    "Durée de sommeil (min)": asleep,
    "Durée au lit (min)": inBed,
    "Durée de sommeil léger (min)": asleep - deep - rem,
    "Durée de sommeil profond (SLP) (min)": deep,
    "Durée du sommeil paradoxal (min)": rem,
    "Durée d'éveil (min)": awake,
    "Besoin de sommeil (min)": need,
    "Dette de sommeil (min)": Math.round(debt),
    "Efficacité du sommeil %": Math.round((asleep / inBed) * 100),
    "Régularité du sommeil %": consistency,
  };
  cycles.push({
    ...head,
    "Score de récupération %": recovery,
    "Fréquence cardiaque au repos (bpm)": Math.round(rhr),
    "Variabilité de la fréquence cardiaque (ms)": Math.round(hrv),
    "Température cutanée (celsius)": r1(33.6 + gauss(0.25)),
    "Oxygène sanguin %": r1(clamp(96.2 - 1.6 * (o >= altO ? 1 : 0) + gauss(0.5), 90, 99.5)),
    "Effort du jour": dayStrain,
    "Énergie dépensée (cal)": Math.round(2200 + dayStrain * 75 + gauss(80)),
    "FC max (bpm)": Math.round(110 + dayStrain * 3.6),
    "FC moyenne (bpm)": Math.round(rhr + 14 + dayStrain * 0.6),
    ...sleep,
  });
  sleeps.push({ ...head, ...sleep, "Sieste": "false" });
  if (!inPlan && chance(0.04)) {
    // quelques siestes : doivent être ignorées par l'app
    sleeps.push({ ...head, "Heure d'endormissement": ts(d, 14 * 60 + 20), "Heure de réveil": ts(d, 14 * 60 + 52), "Durée de sommeil (min)": 28, "Durée au lit (min)": 32, "Sieste": "true" });
  }
  for (const w of workouts.filter((x) => x.d === d)) Object.assign(w.row, head);
  if (answered) for (const Q of QUESTIONS) journal.push({ ...head, "Texte de la question": Q.q, "Réponse oui": ans[Q.q] ? "true" : "false", "Notes": "" });

  // pesée (dans l'app, pas WHOOP) — dès le début du plan, ~4 matins sur 7
  if (inPlan) {
    const weeks = (o - planStartO) / 7;
    weightKg = 76.8 + 0.31 * weeks + gauss(0.28) + (alcohol ? 0.3 : 0);
    if (chance(0.62) || o === planStartO || isToday) tracking.weights[d] = r1(weightKg);
  }

  if (!isToday) { atl += (dayStrain - atl) / 7; ctl += (dayStrain - ctl) / 28; }
  prevStrain = dayStrain;
}

// checklist du soir (saisie dans l'app) : soir J ↔ cycle J+1
for (let o = planStartO; o < todayO; o++) {
  const d = day(o), next = day(o + 1);
  const a = answersByDay.get(next);
  if (!a || chance(0.08)) continue; // soirs oubliés
  tracking.evening[d] = {
    protein: a[QUESTIONS[3].q] || chance(0.3),
    recoveryDrink: !a[QUESTIONS[0].q] && chance(0.9),
    // coucher en minutes relatives à minuit du réveil (négatif = la veille) ; 23:45 → -15
    bedtime: (bedtimeByDay.get(next) ?? 999) <= BEDTIME_TARGET - 1440,
  };
}

// ─── plan.json ───
const addD = (d, n) => day(ord(d) + n);
const weeks = [];
for (let w = 1; w <= 13; w++) {
  const start = addD(PLAN_START, (w - 1) * 7);
  const end = w === 13 ? addD(PLAN_START, PLAN_DAYS - 1) : addD(start, 6);
  const done = planDone.get(w) ?? [];
  const sessions = planSessions(w).map((s) => {
    const real = done.find((x) => x.key === s.key);
    return { id: `w${w}-${s.key}`, title: s.title, type: s.type, detail: s.detail, done: !!real, doneOn: real?.date ?? null, note: null };
  });
  const tests = [];
  TEST_DAYS.forEach((td, k) => {
    const date = addD(PLAN_START, td);
    if (date < start || date > end) return;
    for (const b of TEST_PROGRAM[k]) {
      const bm = BENCHMARKS.find((x) => x.id === b);
      tests.push({ id: `t${k + 1}-${b}`, date, benchmarkId: b, exercise: bm.label, result: TEST_RESULTS[k]?.[b] ?? null, unit: bm.unit });
    }
  });
  weeks.push({ id: `w${w}`, index: w, start, end, sessions, tests });
}
const plan = {
  $schema: "./plan.schema.json",
  schema: "sport-hermes/plan@1",
  demo: true,
  demoNote: "EXEMPLE DE DÉMO — à remplacer par le plan écrit par le coach IA.",
  id: "hiver-2026-masse",
  title: "Plan 90 jours — Prise de masse",
  goal: "Prendre de la masse en s'entraînant dur cet hiver (1 800 m), puis Hyrox solo chronométré au printemps.",
  start: PLAN_START,
  end: addD(PLAN_START, PLAN_DAYS - 1),
  event: { name: "Hyrox solo", date: HYROX_DATE, description: "Test chronométré en solo, après le plan." },
  targets: {
    sessionsPerWeek: 5,
    sleepMinutes: 450,
    bedtime: "23:45",
    weight: { startKg: 76.8, gainPerWeekKg: [0.2, 0.4] },
  },
  benchmarks: BENCHMARKS,
  blocks: BLOCKS.map((b) => ({
    id: b.id, name: b.name, goal: b.goal,
    start: weeks[b.weeks[0] - 1].start, end: weeks[b.weeks[1] - 1].end,
    weeks: weeks.slice(b.weeks[0] - 1, b.weeks[1]),
  })),
};

// ─── écriture ───
mkdirSync(DEMO_DIR, { recursive: true });
const rev = (a) => [...a].reverse(); // l'export WHOOP liste du plus récent au plus ancien
writeFileSync(resolve(DEMO_DIR, "physiological_cycles.csv"), "﻿" + csv(CYCLE_COLS, rev(cycles)));
writeFileSync(resolve(DEMO_DIR, "sommeil.csv"), "﻿" + csv(SLEEP_COLS, rev(sleeps)));
writeFileSync(resolve(DEMO_DIR, "entraînements.csv"), "﻿" + csv(WORKOUT_COLS, rev(workouts.map((w) => w.row))));
writeFileSync(resolve(DEMO_DIR, "journal_entries.csv"), "﻿" + csv(JOURNAL_COLS, rev(journal)));
writeFileSync(resolve(DEMO_DIR, "tracking.json"), JSON.stringify({ demo: true, syncedAt: `${END} ${SYNC}`, ...tracking }, null, 2) + "\n");
writeFileSync(resolve(DEMO_DIR, "meta.json"), JSON.stringify({ demo: true, exportedAt: `${END} ${SYNC}` }, null, 2) + "\n");
writeFileSync(resolve(ROOT, "public/data/plan.json"), JSON.stringify(plan, null, 2) + "\n");

const recs = cycles.map((c) => c["Score de récupération %"]);
const alc = journal.filter((j) => j["Texte de la question"] === QUESTIONS[0].q);
console.log(`${cycles.length} cycles, ${workouts.length} entraînements, ${journal.length} réponses de journal, ${Object.keys(tracking.weights).length} pesées`);
console.log(`récup moy ${Math.round(recs.reduce((a, b) => a + b) / recs.length)} · aujourd'hui ${recs.at(-1)} · alcool oui ${alc.filter((j) => j["Réponse oui"] === "true").length}/${alc.length}`);
console.log(`activité sans type : ${Math.round((workouts.filter((w) => w.row["Nom de l'activité"] === "Activité").length / workouts.length) * 100)} %`);
