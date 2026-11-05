/**
 * Miroir JS des tokens CSS (src/index.css → @theme).
 * Nécessaire là où Motion interpole des couleurs (halo, anneau) et dans le SVG visx.
 * Toute modification doit être faite aux DEUX endroits.
 */
export const color = {
  bg: "#07090C",
  text: "#F2F4F7",
  muted: "#8A93A3",
  faint: "#5D6574",
  line: "rgba(255,255,255,0.08)",
  hairline: "rgba(255,255,255,0.05)",
  recHigh: "#2EE59D",
  recMid: "#F5C542",
  recLow: "#FF4D5E",
  strain: "#3DA5FF",
  sleep: "#8E9BFF",
} as const;

export const ease = {
  out: [0.16, 1, 0.3, 1] as const, // ease-out « confiant » : transitions standard
  soft: [0.33, 1, 0.68, 1] as const, // remplissage de l'anneau
};

export const duration = {
  micro: 0.12,
  base: 0.24,
  value: 0.6, // changement de jour : chiffres, couleurs
  ring: 0.9, // remplissage initial de l'anneau
  range: 0.55, // changement 7 / 30 / 90 j
  halo: 1.2,
};

/** Séquence de chargement (secondes) : structure → anneau → stats → graphiques. */
export const load = {
  structure: 0,
  ring: 0.15,
  stats: 0.5,
  statsStagger: 0.07,
  charts: 0.8,
};
