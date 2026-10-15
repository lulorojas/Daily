import { useState } from 'react';
import { PeriodSelector } from '../components/progreso/PeriodSelector';
import { ProgComoVenis } from '../components/progreso/ProgComoVenis';
import { ProgLastTrained } from '../components/progreso/ProgLastTrained';
import { ProgComoComes } from '../components/progreso/ProgComoComes';
import { ProgMealScore } from '../components/progreso/ProgMealScore';
import { ProgBodyWeight } from '../components/progreso/ProgBodyWeight';
import { ProgTipos } from '../components/progreso/ProgTipos';
import { ProgCargas } from '../components/progreso/ProgCargas';
import { ProgGymStreaks } from '../components/progreso/ProgGymStreaks';
import { useData } from '../hooks/useData';
import { progStart } from '../lib/progress';

/* ============================================================================
   PROGRESO

   Port de viewProgreso(), redibujada en el rediseño Nocturne. Un tablero de solo lectura:
   consolida números que ya viven en Gimnasio, Hábitos y Comidas, sin agregar ninguna
   colección nueva al documento y sin escribir nada — ni un update() en toda la pantalla.
   El selector de período de arriba (Semana, Mes, 3 meses, 6 meses, Año, Todo) recorta casi
   todo lo de abajo de una sola vez; "Rachas" y "Último entreno" miran siempre el
   presente.

   Orden de los bloques (en escritorio, en una grilla de 12 columnas):
     Cómo venís                                  (ancho completo — lo más importante)
     Cómo comés (7) | ¿Comiste bien? (5)
     Último entreno (6) | Entrenamientos por tipo (6)
     Progreso de carga (6) | Rachas (6)
     Peso corporal                               (ancho completo, al final)
   En el celular van todos en una columna, en el mismo orden.

   Qué se fue respecto de la versión anterior (rediseño Nocturne):
     - "Frecuencia semanal" y el "Mapa de entrenamientos" → "Último entreno", que dice
       cuándo fue la última vez de cada tipo en vez de promedios;
     - "Entrenamientos por tipo" y "Balance muscular" → una sola tarjeta con la dona.
   Ninguna de las dos cosas tenía equivalente en vanilla, así que no hay contra qué
   comparar: src/compat/screens.test.jsx ya compensa las secciones que React tiene y
   vanilla no ("Cómo venís", "Cómo comés", "¿Comiste bien?", "Último entreno"). */
export function ProgresoPage() {
  const { data } = useData();
  const [period, setPeriod] = useState('mes');
  const start = progStart(period);

  return (
    <div className="view">
      <div className="head proghead">
        <div className="progtitle">
          <h1>Progreso</h1>
          <div className="sub">Tu evolución, en un solo lugar.</div>
        </div>
        <div className="progselector-wrap">
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="body prog2">
        <ProgComoVenis data={data} per={period} />
        <ProgComoComes data={data} per={period} className="span-7" />
        <ProgMealScore data={data} per={period} className="span-5" />
        <ProgLastTrained data={data} className="span-6" />
        <ProgTipos data={data} per={period} start={start} className="span-6" />
        <ProgCargas data={data} per={period} className="span-6" />
        <ProgGymStreaks data={data} className="span-6" />
        <ProgBodyWeight data={data} per={period} start={start} />
      </div>
    </div>
  );
}
