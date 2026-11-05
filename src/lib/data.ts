import { mapExport, type Dataset, type WhoopExport } from "@/types/whoop";

/**
 * Point d'entrée UNIQUE des données.
 *
 * Aujourd'hui : lit le fichier statique `public/data/demo.json`.
 * Session 2 : remplacer l'URL par l'endpoint FastAPI (ex. `/api/dashboard`) qui
 * renverra le même format brut WHOOP — le mapping reste identique.
 */
const SOURCE_URL = `${import.meta.env.BASE_URL}data/demo.json`;

export class SyncError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
    this.name = "SyncError";
  }
}

export async function getData(signal?: AbortSignal): Promise<Dataset> {
  // Outil de revue design : ?state=loading | error | empty force un état.
  const forced = new URLSearchParams(window.location.search).get("state");
  if (forced === "loading") return new Promise(() => {});
  if (forced === "error") {
    await new Promise((r) => setTimeout(r, 500));
    throw new SyncError("Synchronisation impossible", "GET /api/dashboard → 502 Bad Gateway");
  }

  let res: Response;
  try {
    res = await fetch(SOURCE_URL, { signal, cache: "no-cache" });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new SyncError("Serveur injoignable", (e as Error).message);
  }
  if (!res.ok) throw new SyncError("Synchronisation impossible", `GET ${SOURCE_URL} → ${res.status}`);

  const raw = (await res.json()) as WhoopExport;
  const data = mapExport(raw);
  if (forced === "empty") return { ...data, days: [], workouts: [], performances: [] };
  return data;
}
