import { useState } from 'react';
import { PeriodSelector } from '../components/progreso/PeriodSelector';
import { ProgComoVenis } from '../components/progreso/ProgComoVenis';
import { ProgWeeklyFreq } from '../components/progreso/ProgWeeklyFreq';
import { ProgComoComes } from '../components/progreso/ProgComoComes';
import { ProgBodyWeight } from '../components/progreso/ProgBodyWeight';
import { ProgRanking } from '../components/progreso/ProgRanking';
import { ProgBalance } from '../components/progreso/ProgBalance';
import { ProgGymHeatmap } from '../components/progreso/ProgGymHeatmap';
import { ProgCargas } from '../components/progreso/ProgCargas';
import { ProgGymStreaks } from '../components/progreso/ProgGymStreaks';
import { useData } from '../hooks/useData';
import { progStart } from '../lib/progress';

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
   NINGÚN bloque de hábitos. En el lugar de Frecuencia va ProgGymHeatmap, un mapa de calor
   día por día de las sesiones de entreno — mismo dibujo que tenía el "Mapa de hábitos" de
   la etapa 6, pero contando gimnasio en vez de hábitos. Ninguna de estas piezas tiene
   equivalente en vanilla — no hay contra qué comparar acá, así que
   src/compat/screens.test.jsx compensa sacando de vanilla las cuatro secciones que ya no
   están en React ("Mapa de hábitos", "Rachas", "Frecuencia de entrenamiento",
   "Cumplimiento de hábitos") y sacando de React las que vanilla no tiene ("Cómo venís",
   "Frecuencia semanal", "Mapa de entrenamientos").

   Segunda vuelta de este rediseño, pedido explícito ("la pantalla resumen no sirve"): se
   sacó el bloque "Resumen" (ResumenTiles) entero — ya no queda ninguna sección que se
   calcule aparte y se superponga con lo que ya cuentan "Cómo venís"/"Entrenamientos por
   tipo". Por el mismo pedido, "Resumen" entra a la lista de arriba que
   src/compat/screens.test.jsx le saca a vanilla antes de comparar texto (vanilla sigue
   teniéndolo, React ya no).

   Tercera vuelta, pedido explícito ("quiero que a nivel seguimiento daily entienda si
   estoy comiendo bien o mal" + "¿dónde lo mostrás? — en Progreso, junto a Cómo venís"):
   se agrega ProgComoComes, calco de ProgComoVenis para el plan de comidas — ver
   comoComes() en lib/meals.js. Tampoco tiene equivalente en vanilla, mismo tratamiento
   que "Cómo venís" en screens.test.jsx. */
export function ProgresoPage() {
  const { data } = useData();
  const [period, setPeriod] = useState('mes');
  const start = progStart(period);

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
        <ProgComoVenis data={data} per={period} />
        <ProgWeeklyFreq data={data} per={period} />
        <ProgComoComes data={data} per={period} />

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
