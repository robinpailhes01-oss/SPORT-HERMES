# SPORT-HERMES — Forme

Tableau de bord perso de forme et de progression (front uniquement, statique).
Vite · React · TypeScript · Tailwind v4 · Motion · visx · shadcn/ui (restylé verre).

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # → dist/ (statique, base relative : servable à la racine ou sous un sous-chemin)
npm run demo:generate  # régénère public/data/demo.json (90 jours, déterministe)
```

- Design, tokens, interactions : [`DESIGN.md`](./DESIGN.md)
- Captures : [`docs/screenshots/`](./docs/screenshots)
- États à revoir : `?state=loading`, `?state=error`, `?state=empty`
- Captures de vérification : `node scripts/shoot.cjs <dossier> [scénario…]` (Playwright)

## Données

Un seul point d'entrée : `getData()` dans `src/lib/data.ts`. En session 2, elle appellera l'endpoint
FastAPI, qui devra renvoyer le même format brut WHOOP (`physiological_cycles`, `workouts`,
`performances`). Le mapping vers des champs propres vit dans `src/types/whoop.ts`.

## Déploiement sur le VPS (à venir)

`dist/` est servi tel quel par FastAPI, par exemple :

```python
app.mount("/", StaticFiles(directory="dist", html=True), name="dashboard")
```
