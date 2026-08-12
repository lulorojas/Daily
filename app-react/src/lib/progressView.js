/* ----------------------------- TEXTOS DE PROGRESO -----------------------------
   Lo que falta de puro texto después de lib/progress.js (que ya trae progStart,
   progLabel, progPeriodNote y progWeekWindow, portados en la etapa 2). Acá solo lo nuevo
   que apareció al dibujar la pantalla. */

// La unidad del promedio de cumplimiento de hábitos: cambia según qué representa cada
// barra del gráfico (un día en semana/mes, una semana en año, un mes en todo).
export function bucketUnit(per) {
  return { semana: 'por día', mes: 'por día', ano: 'por semana', todo: 'por mes' }[per];
}

// Los pasos de intensidad del heatmap, del más flojo al más lleno. Van con el mismo
// alfa que usaba tint() en vanilla ('4D','80','B3','E6','FF'), sin el '00' inicial:
// un día con 0% no pinta nada (fondo transparente), así que no hace falta un paso para eso.
export const HEATMAP_STEPS = ['4D', '80', 'B3', 'E6', 'FF'];

// A qué paso del heatmap corresponde una fracción de cumplimiento (0 a 1).
export function heatmapStep(frac) {
  if (frac <= 0) return null;
  return HEATMAP_STEPS[Math.min(4, Math.ceil(frac * 5) - 1)];
}
