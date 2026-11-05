# SPORT-HERMES — Forme

Tableau de bord perso de forme et de progression (front uniquement, statique).
Vite · React · TypeScript · Tailwind v4 · Motion · visx · shadcn/ui (restylé verre).

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # → dist/ (statique, base relative : servable à la racine ou sous un sous-chemin)
npm run demo:generate  # régénère les CSV de démo + public/data/plan.json (déterministe)
```

- Design, tokens, interactions : [`DESIGN.md`](./DESIGN.md)
- Captures : [`docs/screenshots/`](./docs/screenshots)
- États à revoir : `?state=loading`, `?state=error`, `?state=empty`, `?asof=2026-11-20` (avant le plan), `?source=demo`
- Captures de vérification : `node scripts/shoot.cjs <dossier> [scénario…]` (Playwright)

## Tes vrais exports WHOOP

Dépose tes 4 CSV (en-têtes français tels quels) dans `public/data/` :

```
public/data/physiological_cycles.csv
public/data/sommeil.csv
public/data/entraînements.csv
public/data/journal_entries.csv
```

Ils passent automatiquement devant les fichiers de démo. Ils sont dans `.gitignore` (données de santé) :
ils ne partent pas sur GitHub sauf si tu les ajoutes avec `git add -f`.
Si une colonne n'est pas reconnue, une ligne jaune l'indique en bas du dashboard.

## Données

- WHOOP : `getData()` dans `src/lib/data.ts` lit les CSV et normalise les en-têtes vers des champs propres
  (`src/types/whoop.ts`). Plus tard : même fonction, branchée sur l'API FastAPI.
- Plan : `public/data/plan.json` (exemple de démo), schéma pour le coach IA dans `public/data/plan.schema.json`.
- Saisies (cases, notes, soir, pesées) : `src/lib/plan.ts`, une seule couche de persistance (localStorage → API).

## Déploiement sur le VPS (à venir)

`dist/` est servi tel quel par FastAPI, par exemple :

```python
app.mount("/", StaticFiles(directory="dist", html=True), name="dashboard")
```
