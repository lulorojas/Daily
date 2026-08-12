import { useMemo, useState } from 'react';
import { PeriodSelector } from '../components/progreso/PeriodSelector';
import { ResumenTiles } from '../components/progreso/ResumenTiles';
import { ProgBodyWeight } from '../components/progreso/ProgBodyWeight';
import { ProgRanking } from '../components/progreso/ProgRanking';
import { ProgBalance } from '../components/progreso/ProgBalance';
import { ProgFrecuencia } from '../components/progreso/ProgFrecuencia';
import { ProgCargas } from '../components/progreso/ProgCargas';
import { ProgGymStreaks } from '../components/progreso/ProgGymStreaks';
import { ProgCumplimiento } from '../components/progreso/ProgCumplimiento';
import { ProgHeatmap } from '../components/progreso/ProgHeatmap';
import { ProgStreaks } from '../components/progreso/ProgStreaks';
import { Section } from '../components/ui/Section';
import { useData } from '../hooks/useData';
import { gymHistory } from '../lib/gym';
import { habitDayMarks, habitDayPossible } from '../lib/habits';
import { inPeriod, progStart } from '../lib/progress';
import { todayISO } from '../lib/dates';

/* ============================================================================
   PROGRESO

   Port de viewProgreso(). Un tablero de solo lectura: consolida números que ya viven en
   Gimnasio y Hábitos, sin agregar ninguna colección nueva al documento y sin escribir
   nada — ni un update() en toda la pantalla. El selector de período de arriba recorta
   TODO lo de abajo de una sola vez.

   Nueve bloques, siempre en el mismo orden que la app vanilla. Cada uno decide su propio
   estado vacío (EmptyCard adentro de cada componente), porque el mensaje cambia según qué
   falta: no es lo mismo "no tenés hábitos" que "no tenés datos en este recorte".
   ============================================================================ */
export function ProgresoPage() {
  const { data } = useData();
  const [period, setPeriod] = useState('mes');
  const start = progStart(period);

  const resumen = useMemo(() => ({
    entrenos: gymHistory(data).filter((x) => inPeriod(x.date, start)).length,
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

        <ProgBodyWeight data={data} per={period} start={start} />
        <ProgRanking data={data} per={period} start={start} />
        <ProgBalance data={data} per={period} start={start} />
        <ProgFrecuencia data={data} per={period} start={start} />
        <ProgCargas data={data} per={period} start={start} />
        <ProgGymStreaks data={data} />
        <ProgCumplimiento data={data} per={period} />
        <ProgHeatmap data={data} per={period} />
        <ProgStreaks data={data} />
      </div>
    </div>
  );
}
