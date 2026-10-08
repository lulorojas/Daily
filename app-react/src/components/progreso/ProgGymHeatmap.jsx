import { useEffect, useState } from 'react';
import { EmptyCard, Section } from '../ui/Section';
import { gymDayCounts, gymDayTypes, gymHistory, gymSessions } from '../../lib/gym';
import { progWeekWindow } from '../../lib/progress';
import { DOW_MINI, MONTHS, addDays, iso, shortDate, todayISO } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* ----------------------------- MAPA DE ENTRENAMIENTOS -----------------------------
   Etapa 7, pedido explícito de Lulo: reemplaza a "Frecuencia de entrenamiento" (barras
   semanales) con un mapa de calor día por día, misma idea que el "Mapa de hábitos" que
   se sacó de esta pantalla en la etapa 6 — de hecho es su mismo dibujo, solo que ahora
   cuenta gymDayCounts() (sesiones de entreno) en vez de marcas de hábitos.

   Confirmado con Lulo: UN solo color con intensidad según cuántas sesiones hubo ese día
   (0 = casi invisible, 1/2/3+ = tres pasos), no un color distinto por tipo — más simple
   de leer y evita el problema de qué color mostrar en un día con dos turnos de tipos
   distintos. Sin equivalente en vanilla: no hay contra qué comparar, así que
   src/compat/screens.test.jsx la saca del lado React antes de comparar texto.

   Segunda vuelta (mismo pedido, corrección): dos cosas que le faltaban al mapa de
   hábitos original y que acá SÍ hacen falta — una referencia de fecha (qué mes es cada
   columna, no solo "cuántas semanas") y un detalle de qué se entrenó al tocar un día. Lo
   segundo NO puede ser el `title` nativo del navegador: la app es sobre todo celular, y
   ahí no hay "pasar el mouse por arriba". Se resuelve con el mismo patrón que ya usa
   LineChart (ui/LineChart.jsx) para el globito de un punto — clic/toque abre, clic afuera
   cierra — pero anclado a la celda en vez de a coordenadas de un SVG, porque acá no hay
   un canvas único: cada celda es su propio `position:relative` y el globito es su hijo
   absoluto, así no hace falta convertir columna de grilla a porcentaje de nada. */
const STEPS = ['4D', 'B3', 'FF']; // 1, 2, 3+ sesiones ese día

function stepFor(n) { return n > 0 ? STEPS[Math.min(2, n - 1)] : null; }

export function ProgGymHeatmap({ data, per }) {
  const hist = gymHistory(data);

  return (
    <Section label="Mapa de entrenamientos">
      {hist.length === 0 ? (
        <EmptyCard size="tight">Marcá entrenamientos para ver tu mapa.</EmptyCard>
      ) : (
        <GymHeatmapCard hist={hist} sessions={gymSessions(data)} per={per} />
      )}
    </Section>
  );
}

function GymHeatmapCard({ hist, sessions, per }) {
  const win = progWeekWindow(per, [hist[hist.length - 1].date]);
  // La intensidad del color es por SESIÓN (un turno de 3 músculos sigue siendo 1), pero
  // el globito al tocar la celda sigue mostrando los músculos — eso sí sale de `hist`.
  const counts = gymDayCounts(sessions);
  const types = gymDayTypes(hist);
  const tISO = todayISO();
  const [abierto, setAbierto] = useState(null); // fecha ISO de la celda con el globito abierto

  useEffect(() => {
    if (abierto === null) return undefined;
    const fuera = (e) => { if (!e.target.closest('.heatmapcard')) setAbierto(null); };
    document.addEventListener('click', fuera, true);
    return () => document.removeEventListener('click', fuera, true);
  }, [abierto]);

  // Una etiqueta de mes por columna: solo en la primera semana de la ventana y cada vez
  // que el mes cambia respecto de la columna anterior — igual que un calendario de commits.
  const meses = Array.from({ length: win.weeks }, (_, w) => {
    const d = addDays(win.from, w * 7);
    const anterior = w > 0 ? addDays(win.from, (w - 1) * 7) : null;
    return anterior && anterior.getMonth() === d.getMonth() ? '' : MONTHS[d.getMonth()].slice(0, 3);
  });

  return (
    <div className="card heatmapcard">
      <div className="heatmonths" style={{ gridTemplateColumns: `repeat(${win.weeks},minmax(0,1fr))` }}>
        {meses.map((m, w) => <span key={w}>{m}</span>)}
      </div>

      {Array.from({ length: 7 }, (_, d) => (
        <div className="heatrow" key={d}>
          <span className="heatrow-dow">{DOW_MINI[d]}</span>
          <div className="heatrow-cells" style={{ gridTemplateColumns: `repeat(${win.weeks},minmax(0,1fr))` }}>
            {Array.from({ length: win.weeks }, (_, w) => {
              const cISO = iso(addDays(win.from, w * 7 + d));
              const future = cISO > tISO;
              const step = future ? null : stepFor(counts[cISO] || 0);
              const bg = future ? 'transparent' : step ? tint(C.teal, step) : 'rgba(255,255,255,.05)';
              const abiertoAca = abierto === cISO;
              return (
                <button
                  type="button"
                  key={cISO}
                  className={`heatcell${cISO === tISO ? ' today' : ''}`}
                  style={{ background: bg }}
                  disabled={future}
                  data-date={cISO}
                  aria-label={`${shortDate(cISO)}: ${(types[cISO] || []).join(', ') || 'sin entreno'}`}
                  aria-expanded={abiertoAca}
                  onClick={(e) => { e.stopPropagation(); setAbierto((prev) => (prev === cISO ? null : cISO)); }}
                >
                  {abiertoAca && (
                    <span className="charttip show heatcell-tip">
                      {shortDate(cISO)} · {(types[cISO] || []).join(', ') || 'sin entreno'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="heatlegend">
        <span>menos</span>
        {STEPS.map((step) => <span key={step} className="heatlegend-dot" style={{ background: tint(C.teal, step) }} />)}
        <span>más</span>
        <span className="grow" />
        <span>{shortDate(iso(win.from))} – {shortDate(tISO)}</span>
      </div>
    </div>
  );
}
