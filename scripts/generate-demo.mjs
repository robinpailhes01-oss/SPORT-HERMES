// Génère public/data/demo.json — 90 jours de données de démo cohérentes,
// au format exact des colonnes de l'export WHOOP.
//
// Modèle (simplifié mais causal) :
//   - plan hebdo d'un athlète hybride (CrossFit, Hyrox, course, force, mobilité)
//   - strain du jour = combinaison quadratique des séances + activité de fond
//   - la récup du jour J dépend du strain de J-1, du sommeil de la nuit, et de la
//     fatigue accumulée (charge aiguë 7 j vs chronique 28 j)
//   - progression lente de la forme : HRV de base ↑, FC repos de base ↓
//   - un épisode de maladie (3 jours rouges), une semaine de décharge,
//     un jour sans bracelet (valeurs vides), des nuits courtes le week-end
//
// Déterministe : même graine → même fichier. `npm run demo:generate`

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/data/demo.json");

const DAYS = 90;
const END = { y: 2026, m: 11, d: 5 }; // dernier cycle = "aujourd'hui" de la démo
const SYNC_TIME = "07:12:04";

// ---------- RNG déterministe ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261105);
const uni = (a, b) => a + (b - a) * rand();
const gauss = (sd = 1) => {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const r1 = (v) => Math.round(v * 10) / 10;

// ---------- dates (calendrier local, sans fuseau) ----------
const pad = (n) => String(n).padStart(2, "0");
function addDays({ y, m, d }, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), dow: t.getUTCDay() };
}
const ymd = (o) => `${o.y}-${pad(o.m)}-${pad(o.d)}`;
function stamp(dateObj, minutesFromMidnight) {
  // minutesFromMidnight peut être négatif (veille au soir) ou > 1440
  const dayShift = Math.floor(minutesFromMidnight / 1440);
  const mins = minutesFromMidnight - dayShift * 1440;
  const o = addDays(dateObj, dayShift);
  const h = Math.floor(mins / 60);
  const mi = Math.floor(mins % 60);
  const s = Math.floor(rand() * 60);
  return `${ymd(o)} ${pad(h)}:${pad(mi)}:${pad(s)}`;
}

// ---------- séances ----------
// Les noms reprennent le vocabulaire d'activités WHOOP ; la catégorisation
// (CrossFit / Hyrox / Course / Force / Mobilité) est faite côté front.
const SESSION = {
  crossfit: { name: "CrossFit", dur: [55, 70], strain: [12.8, 15.6], hr: [146, 156], max: [178, 189] },
  hyrox: { name: "Hyrox", dur: [60, 78], strain: [14.2, 17.0], hr: [152, 163], max: [182, 192] },
  hyroxSim: { name: "Hyrox", dur: [82, 98], strain: [17.0, 18.9], hr: [158, 166], max: [187, 194] },
  intervals: { name: "Running", dur: [42, 55], strain: [11.4, 14.2], hr: [150, 160], max: [178, 188] },
  longRun: { name: "Running", dur: [68, 92], strain: [12.2, 14.4], hr: [143, 151], max: [166, 176] },
  strength: { name: "Weightlifting", dur: [58, 78], strain: [8.2, 11.2], hr: [112, 126], max: [152, 168] },
  mobility: { name: "Yoga", dur: [28, 42], strain: [2.8, 5.2], hr: [86, 98], max: [104, 118] },
};

// plan par jour de semaine (0 = dimanche)
function planFor(dow, weekIdx, rng) {
  const satIsSim = weekIdx % 2 === 0;
  switch (dow) {
    case 1: return [["crossfit", "eve"]];
    case 2: return [["intervals", "am"]];
    case 3: return rng < 0.45 ? [["strength", "eve"], ["mobility", "late"]] : [["strength", "eve"]];
    case 4: return [["hyrox", "eve"]];
    case 5: return rng < 0.7 ? [["crossfit", "eve"]] : [];
    case 6: return [[satIsSim ? "hyroxSim" : "longRun", "am"]];
    case 0: return rng < 0.6 ? [["mobility", "am"]] : [];
    default: return [];
  }
}

const SLOT = { am: [6 * 60 + 40, 8 * 60 + 30], eve: [18 * 60 + 5, 19 * 60 + 25], late: [20 * 60 + 10, 20 * 60 + 50] };

// ---------- simulation ----------
const start = addDays(END, -(DAYS - 1));
const SICK = new Set([47, 48, 49]); // index de jour (0 = plus ancien)
const DELOAD = [63, 69]; // semaine de décharge
const NO_STRAP = 27; // bracelet non porté : valeurs physiologiques vides
const LAST = DAYS - 1;

let atl = 11; // charge aiguë (EMA 7 j)
let ctl = 11; // charge chronique (EMA 28 j)
let prevStrain = 11;
let wellness = 0; // composante lente (stress de vie, météo, voyage…) — AR(1)
const cycles = [];
const workouts = [];

for (let i = 0; i < DAYS; i++) {
  const day = addDays(start, i);
  const weekIdx = Math.floor(i / 7);
  const progress = i / (DAYS - 1);
  const baseHrv = 66 + 8 * progress; // forme qui progresse
  const baseRhr = 50.5 - 3 * progress;
  const sick = SICK.has(i);
  const postSick = i === 50 || i === 51;
  const deload = i >= DELOAD[0] && i <= DELOAD[1];

  // --- nuit qui précède le cycle (J-1 → J) ---
  const weekendNight = day.dow === 0 || day.dow === 6; // nuit de ven→sam, sam→dim
  let asleep = 426 + gauss(28) + (prevStrain > 16 ? 14 : 0);
  if (weekendNight && rand() < 0.45) asleep -= uni(45, 95);
  if (sick) asleep -= uni(20, 60);
  if (i === LAST) asleep = 452; // nuit correcte avant aujourd'hui
  asleep = clamp(asleep, 270, 560);
  const need = 452 + 7 * (prevStrain - 10) + (sick ? 40 : 0);
  const sleepPerf = clamp(Math.round((asleep / need) * 100), 38, 100);

  // --- physiologie du matin ---
  const fatigue = Math.max(0, atl - ctl);
  wellness = 0.75 * wellness + gauss(0.035);
  let hrv =
    baseHrv *
    (1 - 0.013 * (prevStrain - 11)) *
    (1 - 0.025 * fatigue) *
    (1 + 0.003 * (sleepPerf - 85)) *
    (1 + wellness + gauss(0.035));
  let rhr = baseRhr + 0.24 * (prevStrain - 11) + 0.25 * fatigue - 0.04 * (sleepPerf - 85) - 18 * wellness + gauss(0.8);
  let resp = 15.1 + gauss(0.22) + 0.04 * (prevStrain - 11);
  if (sick) { hrv *= uni(0.56, 0.66); rhr += uni(6, 9); resp += uni(1.1, 1.6); }
  if (postSick) { hrv *= 0.84; rhr += 3; resp += 0.4; }
  let recovery = 60 + 135 * (hrv / baseHrv - 1) - 2.4 * (rhr - baseRhr) + 0.3 * (sleepPerf - 85) + gauss(3.5);
  if (sick) recovery = uni(9, 24); // WHOOP écrase la récup en cas de maladie, sans aller à zéro
  recovery = clamp(Math.round(recovery), 4, 99);

  // --- séances du jour ---
  let plan = sick ? [] : planFor(day.dow, weekIdx, rand());
  if (postSick) plan = plan.filter(([k]) => k === "mobility" || k === "strength").slice(0, 1);
  if (!sick && rand() < 0.07) plan = []; // imprévu, séance sautée
  if (i === LAST) plan = []; // aujourd'hui : sync à 7h12, séance du soir pas encore faite
  const dayWorkouts = [];
  for (const [kind, slot] of plan) {
    const s = SESSION[kind];
    const intensity = deload ? 0.72 : 1;
    // une récup basse fait payer plus cher la même séance
    const recMod = recovery < 34 ? 1.06 : recovery > 75 ? 0.98 : 1;
    const dur = Math.round(uni(...s.dur) * (deload ? 0.8 : 1));
    const strain = r1(clamp(uni(...s.strain) * intensity * recMod, 1, 20.5));
    const avgHr = Math.round(uni(...s.hr) * (deload ? 0.96 : 1));
    const maxHr = Math.round(Math.max(avgHr + 14, uni(...s.max) * (deload ? 0.97 : 1)));
    const cal = Math.round(dur * (avgHr - 62) * 0.128 + gauss(18));
    const [a, b] = SLOT[slot];
    const time = stamp(day, Math.round(uni(a, b)));
    dayWorkouts.push(strain);
    workouts.push({
      "Workout start time": time,
      "Duration (min)": dur,
      "Activity name": s.name,
      "Activity Strain": strain,
      "Average HR (bpm)": avgHr,
      "Max HR (bpm)": maxHr,
      "Energy burned (cal)": cal,
    });
  }

  // --- strain du jour ---
  let background = 6.6 + gauss(1.1) + (sick ? -2 : 0);
  let dayStrain = Math.sqrt(dayWorkouts.reduce((acc, s) => acc + s * s, 0) + background * background);
  if (i === LAST) dayStrain = 3.4; // cycle en cours
  dayStrain = r1(clamp(dayStrain, 0.5, 20.9));

  // --- heure de coucher → "Cycle start time" (veille au soir, ou après minuit) ---
  const bedtime = -Math.round(uni(20, 95)) - (weekendNight && asleep < 400 ? 70 : 0);
  const cycleStart = stamp(day, bedtime);

  const noStrap = i === NO_STRAP;
  cycles.push({
    "Cycle start time": cycleStart,
    "Recovery score %": noStrap ? null : recovery,
    "Resting heart rate (bpm)": noStrap ? null : Math.round(rhr),
    "Heart rate variability (ms)": noStrap ? null : Math.round(hrv),
    "Day Strain": dayStrain,
    "Sleep performance %": noStrap ? null : sleepPerf,
    "Asleep duration (min)": noStrap ? null : Math.round(asleep),
    "Respiratory rate (rpm)": noStrap ? null : r1(resp),
  });

  if (i !== LAST) {
    atl += (dayStrain - atl) / 7;
    ctl += (dayStrain - ctl) / 28;
  }
  prevStrain = dayStrain;
}

const out = {
  demo: true,
  source: "whoop-export",
  generator: "scripts/generate-demo.mjs",
  exported_at: `${ymd(END)} ${SYNC_TIME}`,
  timezone: "Europe/Paris",
  physiological_cycles: cycles.reverse(), // l'export WHOOP liste du plus récent au plus ancien
  workouts: workouts.reverse(),
  performances: [],
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

const recs = cycles.map((c) => c["Recovery score %"]).filter((v) => v != null);
const zone = (v) => (v >= 67 ? "green" : v >= 34 ? "yellow" : "red");
const dist = recs.reduce((acc, v) => ((acc[zone(v)] = (acc[zone(v)] || 0) + 1), acc), {});
console.log(`demo.json : ${cycles.length} cycles, ${workouts.length} séances`, dist, "aujourd'hui :", cycles[0]["Recovery score %"]);
