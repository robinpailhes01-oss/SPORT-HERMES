import Papa from "papaparse";
import type { DayKey, DayMetrics, Diagnostics, Dataset, JournalAnswer, SourceKind, Workout } from "@/types/whoop";
import type { Plan } from "@/types/plan";

/**
 * Point d'entrée UNIQUE des données.
 *
 * Aujourd'hui : lit les CSV de l'export WHOOP dans `public/data/` (tes vrais fichiers),
 * sinon ceux de `public/data/demo/`. Plus tard : remplacer `fetchText` par l'API FastAPI.
 *
 * C'est le SEUL fichier qui connaît les en-têtes bruts de WHOOP (en français, avec
 * espaces insécables, accents…). Tout est normalisé ici vers des champs propres.
 */

const BASE = `${import.meta.env.BASE_URL}data/`;

export class SyncError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "SyncError";
  }
}

export interface AppData {
  whoop: Dataset;
  plan: Plan | null;
}

// ─────────────────────────────────────────────────────────────
// Normalisation des en-têtes
// ─────────────────────────────────────────────────────────────

/** "Zone FC 1 %" → "zone fc 1 %", "Score de récupération %" → "score de recuperation %" */
export function normalizeHeader(h: string): string {
  return h
    .replace(/^﻿/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/[   ]/g, " ") // espaces insécables
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

interface FieldSpec {
  /** noms exacts connus (FR + EN), déjà normalisables */
  names: string[];
  /** repli si aucun nom exact ne correspond */
  match?: RegExp;
  /** exclut des colonnes voisines (ex. « durée de sommeil léger ») */
  not?: RegExp;
}

const F = {
  cycleStart: { names: ["Heure de début du cycle", "Cycle start time"], match: /debut du cycle|cycle start/ },
  recovery: { names: ["Score de récupération %", "Recovery score %"], match: /recuperation|recovery/ },
  rhr: { names: ["Fréquence cardiaque au repos (bpm)", "FC au repos (bpm)", "Resting heart rate (bpm)"], match: /repos|resting heart/ },
  hrv: { names: ["Variabilité de la fréquence cardiaque (ms)", "VFC (ms)", "Heart rate variability (ms)"], match: /variabilite|hrv|vfc/ },
  strain: { names: ["Effort du jour", "Day Strain"], match: /effort du jour|day strain/ },
  resp: { names: ["Fréquence respiratoire (rpm)", "Respiratory rate (rpm)"], match: /respiratoire|respiratory/ },
  sleepPerf: { names: ["Performance du sommeil %", "Sleep performance %"], match: /performance du sommeil|sleep performance/ },
  asleep: { names: ["Durée de sommeil (min)", "Asleep duration (min)"], match: /^(duree (de |du )?sommeil|asleep duration)/, not: /leger|profond|paradoxal|rem|light|deep/ },
  need: { names: ["Besoin de sommeil (min)", "Sleep need (min)"], match: /besoin de sommeil|sleep need/ },
  debt: { names: ["Dette de sommeil (min)", "Sleep debt (min)"], match: /dette|sleep debt/ },
  consistency: { names: ["Régularité du sommeil %", "Sleep consistency %"], match: /regularite|consistency/ },
  onset: { names: ["Heure d'endormissement", "Sleep onset"], match: /endormissement|sleep onset/ },
  wake: { names: ["Heure de réveil", "Wake onset"], match: /reveil|wake onset/ },
  nap: { names: ["Sieste", "Nap"], match: /sieste|^nap$/ },
  wStart: { names: ["Heure de début de l'entraînement", "Workout start time"], match: /debut de l'entrainement|workout start/ },
  duration: { names: ["Durée (min)", "Duration (min)"], match: /^(duree|duration) \(min\)$/ },
  activity: { names: ["Nom de l'activité", "Activity name"], match: /nom de l'activite|activity name/ },
  aStrain: { names: ["Effort de l'activité", "Activity Strain"], match: /effort de l'activite|activity strain/ },
  avgHr: { names: ["FC moyenne (bpm)", "Average HR (bpm)"], match: /fc moyenne|average hr|cardiaque moyenne/ },
  maxHr: { names: ["FC max (bpm)", "Max HR (bpm)"], match: /fc max|max hr|cardiaque max/ },
  calories: { names: ["Énergie dépensée (cal)", "Energy burned (cal)"], match: /energie depensee|energy burned/ },
  question: { names: ["Texte de la question", "Question text"], match: /question/ },
  answer: { names: ["Réponse oui", "Answered yes"], match: /reponse|answered/ },
} satisfies Record<string, FieldSpec>;
type FieldKey = keyof typeof F;

type Row = Record<string, string>;

/** Résout chaque champ voulu vers la colonne réelle du fichier. */
function resolveColumns(headers: string[], wanted: FieldKey[]) {
  const norm = headers.map((h) => ({ raw: h, n: normalizeHeader(h) }));
  const map: Partial<Record<FieldKey, string>> = {};
  const missing: string[] = [];
  for (const key of wanted) {
    const spec: FieldSpec = F[key];
    const exact = spec.names.map(normalizeHeader);
    let hit = norm.find((h) => exact.includes(h.n));
    if (!hit && spec.match) hit = norm.find((h) => spec.match!.test(h.n) && !(spec.not && spec.not.test(h.n)));
    if (hit) map[key] = hit.raw;
    else missing.push(spec.names[0]);
  }
  return { get: (row: Row, key: FieldKey) => (map[key] ? row[map[key]!] : undefined), missing };
}

// ─────────────────────────────────────────────────────────────
// Valeurs
// ─────────────────────────────────────────────────────────────

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const s = v.replace(/[  \s]/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function bool(v: string | undefined): boolean | null {
  const s = (v ?? "").trim().toLowerCase();
  if (["true", "vrai", "oui", "yes", "1"].includes(s)) return true;
  if (["false", "faux", "non", "no", "0"].includes(s)) return false;
  return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-05 07:12:04", "2026-11-05T07:12", "05/11/2026 07:12" → composantes locales */
function parseLocal(ts: string | undefined) {
  if (!ts) return null;
  const s = ts.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  if (m) return { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] };
  m = /^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})/.exec(s);
  if (m) return { y: +m[3], mo: +m[2], d: +m[1], h: +m[4], mi: +m[5] };
  return null;
}
const keyOf = (y: number, mo: number, d: number, shift = 0): DayKey => {
  const t = new Date(Date.UTC(y, mo - 1, d + shift));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

/** Un cycle commence à l'endormissement → rattaché au jour du réveil (coucher après midi = lendemain). */
export function cycleDay(cycleStart: string | undefined): DayKey | null {
  const p = parseLocal(cycleStart);
  return p ? keyOf(p.y, p.mo, p.d, p.h >= 12 ? 1 : 0) : null;
}
/** minutes relatives à minuit du jour `day` (négatif = la veille) */
function minutesRelative(ts: string | undefined, day: DayKey): number | null {
  const p = parseLocal(ts);
  if (!p) return null;
  const [y, mo, d] = day.split("-").map(Number);
  const diffDays = Math.round((Date.UTC(p.y, p.mo - 1, p.d) - Date.UTC(y, mo - 1, d)) / 864e5);
  return diffDays * 1440 + p.h * 60 + p.mi;
}
/** clé de jointure stable entre fichiers (sans secondes, format homogène) */
function joinKey(ts: string | undefined): string | null {
  const p = parseLocal(ts);
  return p ? `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}` : null;
}

// ─────────────────────────────────────────────────────────────
// Lecture des fichiers (vrais d'abord, démo en secours)
// ─────────────────────────────────────────────────────────────

const FILES = {
  cycles: ["physiological_cycles.csv"],
  sleep: ["sommeil.csv", "sleeps.csv"],
  // NFC et NFD (macOS) + sans accent
  workouts: ["entra\u00eenements.csv", "entrai\u0302nements.csv", "entrainements.csv", "workouts.csv"],
  journal: ["journal_entries.csv"],
};

async function fetchText(path: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch(BASE + path.split("/").map(encodeURIComponent).join("/"), { signal, cache: "no-cache" });
    if (!res.ok) return null;
    const text = await res.text();
    // un serveur de dev renvoie index.html pour un fichier absent
    if (/^\s*<!doctype html/i.test(text)) return null;
    return text;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return null;
  }
}

async function loadCsv(names: string[], useDemo: boolean, signal?: AbortSignal) {
  if (!useDemo) {
    for (const n of names) {
      const t = await fetchText(n, signal);
      if (t) return { text: t, source: "real" as SourceKind, file: n };
    }
  }
  for (const n of names) {
    const t = await fetchText(`demo/${n}`, signal);
    if (t) return { text: t, source: "demo" as SourceKind, file: n };
  }
  return { text: null, source: "missing" as SourceKind, file: names[0] };
}

function parse(text: string | null): { headers: string[]; rows: Row[] } {
  if (!text) return { headers: [], rows: [] };
  const out = Papa.parse<Row>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", delimiter: "" });
  return { headers: out.meta.fields ?? [], rows: out.data };
}

// ─────────────────────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────────────────────

function mapAll(files: {
  cycles: { headers: string[]; rows: Row[] };
  sleep: { headers: string[]; rows: Row[] };
  workouts: { headers: string[]; rows: Row[] };
  journal: { headers: string[]; rows: Row[] };
}) {
  const cy = resolveColumns(files.cycles.headers, ["cycleStart", "recovery", "rhr", "hrv", "strain", "resp", "sleepPerf", "asleep", "need", "debt", "consistency", "onset", "wake"]);
  const sl = resolveColumns(files.sleep.headers, ["cycleStart", "nap", "sleepPerf", "asleep", "need", "debt", "consistency", "onset", "wake", "resp"]);
  const wo = resolveColumns(files.workouts.headers, ["wStart", "duration", "activity", "aStrain", "avgHr", "maxHr", "calories"]);
  const jo = resolveColumns(files.journal.headers, ["cycleStart", "question", "answer"]);

  // sommeil principal (hors siestes), indexé par début de cycle
  const sleepByCycle = new Map<string, Row>();
  for (const r of files.sleep.rows) {
    if (bool(sl.get(r, "nap")) === true) continue;
    const k = joinKey(sl.get(r, "cycleStart"));
    if (k && !sleepByCycle.has(k)) sleepByCycle.set(k, r);
  }

  const byDay = new Map<DayKey, DayMetrics>();
  const dayByCycle = new Map<string, DayKey>();
  for (const r of files.cycles.rows) {
    const start = cy.get(r, "cycleStart");
    const date = cycleDay(start);
    const jk = joinKey(start);
    if (!date || !jk) continue;
    const s = sleepByCycle.get(jk);
    // le fichier sommeil fait foi pour les colonnes de sommeil, le fichier cycles sert de repli
    const pick = (cyKey: FieldKey, slKey: FieldKey) => num((s && sl.get(s, slKey)) ?? undefined) ?? num(cy.get(r, cyKey));
    const onsetTs = (s && sl.get(s, "onset")) || cy.get(r, "onset") || start;
    const wakeTs = (s && sl.get(s, "wake")) || cy.get(r, "wake");
    byDay.set(date, {
      date,
      cycleStart: start!,
      recovery: num(cy.get(r, "recovery")),
      rhr: num(cy.get(r, "rhr")),
      hrv: num(cy.get(r, "hrv")),
      strain: num(cy.get(r, "strain")),
      respiratoryRate: pick("resp", "resp"),
      sleepPerformance: pick("sleepPerf", "sleepPerf"),
      asleepMin: pick("asleep", "asleep"),
      sleepNeedMin: pick("need", "need"),
      sleepDebtMin: pick("debt", "debt"),
      sleepConsistency: pick("consistency", "consistency"),
      sleepOnsetMin: minutesRelative(onsetTs, date),
      wakeMin: minutesRelative(wakeTs, date),
    });
    dayByCycle.set(jk, date);
  }
  const days = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

  const workouts: Workout[] = [];
  files.workouts.rows.forEach((r, i) => {
    const start = wo.get(r, "wStart");
    const p = parseLocal(start);
    if (!p) return;
    workouts.push({
      id: `${start}#${i}`,
      date: keyOf(p.y, p.mo, p.d),
      time: `${pad(p.h)}:${pad(p.mi)}`,
      start: start!,
      activity: (wo.get(r, "activity") ?? "").trim() || "Activité",
      durationMin: num(wo.get(r, "duration")),
      strain: num(wo.get(r, "aStrain")),
      avgHr: num(wo.get(r, "avgHr")),
      maxHr: num(wo.get(r, "maxHr")),
      calories: num(wo.get(r, "calories")),
    });
  });
  workouts.sort((a, b) => a.start.localeCompare(b.start));

  const journal: JournalAnswer[] = [];
  for (const r of files.journal.rows) {
    const jk = joinKey(jo.get(r, "cycleStart"));
    const date = (jk && dayByCycle.get(jk)) || cycleDay(jo.get(r, "cycleStart"));
    const yes = bool(jo.get(r, "answer"));
    const question = (jo.get(r, "question") ?? "").trim();
    if (date && question && yes !== null) journal.push({ date, question, yes });
  }

  return { days, workouts, journal, missing: { cycles: cy.missing, sleep: sl.missing, workouts: wo.missing, journal: jo.missing } };
}

// ─────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────

export async function getData(signal?: AbortSignal): Promise<AppData> {
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("state");
  if (forced === "loading") return new Promise(() => {});
  if (forced === "error") {
    await new Promise((r) => setTimeout(r, 400));
    throw new SyncError("Synchronisation impossible", "GET /api/whoop → 502 Bad Gateway");
  }
  const useDemo = params.get("source") === "demo";

  const [c, s, w, j, planText] = await Promise.all([
    loadCsv(FILES.cycles, useDemo, signal),
    loadCsv(FILES.sleep, useDemo, signal),
    loadCsv(FILES.workouts, useDemo, signal),
    loadCsv(FILES.journal, useDemo, signal),
    fetchText("plan.json", signal),
  ]);
  if (c.source === "missing") throw new SyncError("Aucun export WHOOP trouvé", "physiological_cycles.csv introuvable dans data/ et data/demo/");

  const files = { cycles: parse(c.text), sleep: parse(s.text), workouts: parse(w.text), journal: parse(j.text) };
  const mapped = mapAll(files);
  const loaded = { cycles: c, sleep: s, workouts: w, journal: j };
  const diagnostics: Diagnostics[] = (Object.keys(loaded) as (keyof typeof loaded)[]).map((k) => ({
    file: loaded[k].file,
    source: loaded[k].source,
    rows: files[k].rows.length,
    missing: mapped.missing[k],
  }));
  if (import.meta.env.DEV) console.table(diagnostics.map((d) => ({ ...d, missing: d.missing.join(" · ") })));

  let syncedAt: string | null = null;
  const demo = diagnostics.some((d) => d.source === "demo");
  if (demo) {
    const meta = await fetchText("demo/meta.json", signal);
    syncedAt = meta ? (JSON.parse(meta).exportedAt as string) : null;
  } else {
    syncedAt = mapped.days.at(-1)?.cycleStart ?? null;
  }

  let { days, workouts, journal } = mapped;
  // ?asof=YYYY-MM-DD : rejoue l'app « comme si on était ce jour-là » (revue design, coach)
  const asof = params.get("asof");
  if (asof) {
    syncedAt = `${asof} 07:41`;
    days = days.filter((d) => d.date <= asof);
    workouts = workouts.filter((x) => x.date < asof);
    journal = journal.filter((x) => x.date <= asof);
  }
  if (forced === "empty") days = [];

  let plan: Plan | null = null;
  if (planText) {
    try {
      plan = JSON.parse(planText) as Plan;
    } catch {
      console.warn("plan.json illisible");
    }
  }

  return { whoop: { demo, syncedAt, days, workouts, journal, diagnostics }, plan };
}

/** Graines de démo des saisies (pesées, checklist du soir) — uniquement en mode démo. */
export async function getDemoTracking(signal?: AbortSignal) {
  const t = await fetchText("demo/tracking.json", signal);
  return t ? (JSON.parse(t) as { weights: Record<string, number>; evening: Record<string, Record<string, boolean>> }) : null;
}
