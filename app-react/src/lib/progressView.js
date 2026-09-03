/* ----------------------------- TEXTOS DE PROGRESO -----------------------------
   Lo que falta de puro texto después de lib/progress.js (que ya trae progStart,
   progLabel, progPeriodNote y progWeekWindow, portados en la etapa 2). Acá solo lo nuevo
   que apareció al dibujar la pantalla. */

// La unidad del promedio de cumplimiento de hábitos: cambia según qué representa cada
// barra del gráfico (un día en semana/mes, una semana en año, un mes en todo).
export function bucketUnit(per) {
  return { semana: 'por día', mes: 'por día', ano: 'por semana', todo: 'por mes' }[per];
}
