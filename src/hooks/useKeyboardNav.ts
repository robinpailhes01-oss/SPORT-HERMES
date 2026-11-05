import { useEffect } from "react";

/** ← / → : jour précédent / suivant. Échap : retour à aujourd'hui. */
export function useKeyboardNav(step: (by: number) => void, goToday: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      // laisse les flèches aux champs et aux groupes à focus itinérant (sélecteur 7/30/90)
      if (t?.closest("input, textarea, select, [contenteditable], [role='group'], [role='radiogroup']")) {
        if (e.key !== "Escape") return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "Escape") {
        goToday();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, goToday]);
}
