import { motion, useReducedMotion } from "motion/react";
import { duration, ease } from "@/lib/tokens";

/**
 * Élément signature : un halo flou derrière l'écran dont la couleur suit la récup
 * du jour sélectionné. Fixe : l'ambiance couvre toute la page, même en scrollant.
 */
export function Halo({ color, intensity = 1 }: { color: string; intensity?: number }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-[-22vh] h-[78vh] w-[min(1100px,150vw)] -translate-x-1/2 rounded-[50%] md:top-[-30vh] md:h-[90vh]"
        style={{ filter: "blur(110px)", willChange: "background-color, opacity" }}
        initial={reduce ? false : { opacity: 0, backgroundColor: color }}
        animate={{ opacity: 0.17 * intensity, backgroundColor: color }}
        transition={reduce ? { duration: 0 } : { duration: duration.halo, ease: ease.out }}
      />
      {/* vignette basse : garde le bas de page profond, lisibilité des listes */}
      <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}
