import { useMemo, useState } from 'react';
import { PeriodSelector } from '../components/progreso/PeriodSelector';
import { ProgComoVenis } from '../components/progreso/ProgComoVenis';
import { ResumenTiles } from '../components/progreso/ResumenTiles';
import { ProgBodyWeight } from '../components/progreso/ProgBodyWeight';
import { ProgRanking } from '../components/progreso/ProgRanking';
import { ProgBalance } from '../components/progreso/ProgBalance';
import { ProgGymHeatmap } from '../components/progreso/ProgGymHeatmap';
import { ProgCargas } from '../components/progreso/ProgCargas';
import { ProgGymStreaks } from '../components/progreso/ProgGymStreaks';
import { Section } from '../components/ui/Section';
import { useData } from '../hooks/useData';
import { gymSessions } from '../lib/gym';
import { habitDayMarks, habitDayPossible } from '../lib/habits';
import { inPeriod, progStart } from '../lib/progress';
import { todayISO } from '../lib/dates';

/* ============================================================================
   PROGRESO

   Port de viewProgreso(). Un tablero de solo lectura: consolida números que ya viven en
   Gimnasio y Hábitos, sin agregar ninguna colección nueva al documento y sin escribir
   nada — ni un update() en toda la pantalla. El selector de período de arriba recorta
   TODO lo de abajo de una sola vez.

   Bloques siempre en el mismo orden que la app vanilla. Cada uno decide su propio estado
   vacío (EmptyCard adentro de cada componente), porque el mensaje cambia según qué falta:
   no es lo mismo "no tenés hábitos" que "no tenés datos en este recorte".

   Etapa 6, pedido explícito de Lulo: Progreso tiene que girar en torno a entrenamientos,
   así que se sacaron dos de los tres bloques de hábitos que traía vanilla — "Mapa de
   hábitos" (heatmap) y "Rachas" (racha por hábito) — y quedó solo "Cumplimiento de
   hábitos".

   Etapa 7, misma dirección: se sacaron "Frecuencia de entrenamiento" (barras semanales)
   y el "Cumplimiento de hábitos" que había quedado de la etapa 6 — Progreso queda sin
   NINGÚN bloque de hábitos (el tile "Hábitos hoy" del Resumen no cuenta: es una foto del
   día, no un bloque de seguimiento). En el lugar de Frecuencia va ProgGymHeatmap, un
   mapa de calor día por día de las sesiones de entreno — mismo dibujo que tenía el "Mapa
   de hábitos" de la etapa 6, pero contando gimnasio en vez de hábitos. Ninguna de estas
   piezas tiene equivalente en vanilla — no hay contra qué comparar acá, así que
   src/compat/screens.test.jsx compensa sacando de vanilla las cuatro secciones que ya no
   están en React ("Mapa de hábitos", "Rachas", "Frecuencia de entrenamiento",
   "Cumplimiento de hábitos") y sacando de React la que vanilla no tiene ("Mapa de
   entrenamientos").
   ============================================================================ */
export function ProgresoPage() {
  const { data } = useData();
  const [period, setPeriod] = useState('mes');
  const start = progStart(period);

  const resumen = useMemo(() => ({
    // Sesiones, no entradas por músculo: un turno de bícep + tríceps + hombro es UN
    // entreno (ver gymSessions() en lib/gym.js).
    entrenos: gymSessions(data).filter((x) => inPeriod(x.date, start)).length,
    tareas: data.items.filter((x) => x.kind === 'tarea' && x.done).length,
    hoyOk: habitDayMarks(data, todayISO()),
    hoyTot: habitDayPossible(data),
  }), [data, start]);

  return (
    <div className="view">
      <div className="head">
        <h1>Progreso</h1>
        <div className="sub">Tu evolución, en un solo lugar.</div>
        <div className="progselector-wrap">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="body prog2">
        <Section label="Resumen">
          <ResumenTiles {...resumen} />
        </Section>

        <ProgComoVenis data={data} per={period} />

        <ProgBodyWeight data={data} per={period} start={start} />
        <ProgRanking data={data} per={period} start={start} />
        <ProgBalance data={data} per={period} start={start} />
        <ProgGymHeatmap data={data} per={period} />
        <ProgCargas data={data} per={period} start={start} />
        <ProgGymStreaks data={data} />
      </div>
    </div>
  );
}
