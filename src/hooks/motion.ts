import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { duration, ease } from "@/lib/tokens";

/**
 * Séquence d'intro (structure → anneau → stats → graphiques) : jouée UNE fois, au
 * premier affichage des données. Un composant remonté plus tard (redimensionnement,
 * changement de layout) s'affiche directement, sans rejouer l'intro.
 */
let introStartedAt: number | null = null;
const INTRO_WINDOW_MS = 600;

export function startIntro() {
  if (introStartedAt === null) introStartedAt = performance.now();
}

export function useIsFirstRender() {
  const [first] = useState(() => introStartedAt === null || performance.now() - introStartedAt < INTRO_WINDOW_MS);
  return first;
}

/**
 * Interpole un tuple de nombres vers une cible (domaines d'axes des courbes).
 * Re-rend à chaque frame : réservé aux petits SVG.
 */
export function useTween(target: number[], seconds = duration.range): number[] {
  const reduce = useReducedMotion();
  const [current, setCurrent] = useState(target);
  const ref = useRef(target);
  const key = target.join("|");

  useEffect(() => {
    const from = ref.current;
    if (from.join("|") === key) return;
    if (reduce) {
      ref.current = target;
      setCurrent(target);
      return;
    }
    const ctrl = animate(0, 1, {
      duration: seconds,
      ease: ease.out,
      onUpdate: (t) => {
        const v = target.map((to, i) => (from[i] ?? to) + (to - (from[i] ?? to)) * t);
        ref.current = v;
        setCurrent(v);
      },
    });
    return () => ctrl.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduce, seconds]);

  return current;
}
