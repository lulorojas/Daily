import { EmptyCard, Section } from '../ui/Section';
import { gymDayCounts, gymHistory } from '../../lib/gym';
import { progWeekWindow } from '../../lib/progress';
import { DOW_MINI, addDays, iso, todayISO } from '../../lib/dates';
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
   src/compat/screens.test.jsx la saca del lado React antes de comparar texto. */
const STEPS = ['4D', 'B3', 'FF']; // 1, 2, 3+ sesiones ese día

function stepFor(n) { return n > 0 ? STEPS[Math.min(2, n - 1)] : null; }

export function ProgGymHeatmap({ data, per }) {
  const hist = gymHistory(data);

  return (
    <Section label="Mapa de entrenamientos">
      {hist.length === 0 ? (
        <EmptyCard size="tight">Marcá entrenamientos para ver tu mapa.</EmptyCard>
      ) : (
        <GymHeatmapCard hist={hist} per={per} />
      )}
    </Section>
  );
}

function GymHeatmapCard({ hist, per }) {
  const win = progWeekWindow(per, [hist[hist.length - 1].date]);
  const counts = gymDayCounts(hist);
  const tISO = todayISO();

  return (
    <div className="card heatmapcard">
      {Array.from({ length: 7 }, (_, d) => (
        <div className="heatrow" key={d}>
          <span className="heatrow-dow">{DOW_MINI[d]}</span>
          <div className="heatrow-cells" style={{ gridTemplateColumns: `repeat(${win.weeks},minmax(0,1fr))` }}>
            {Array.from({ length: win.weeks }, (_, w) => {
              const cISO = iso(addDays(win.from, w * 7 + d));
              const future = cISO > tISO;
              const step = future ? null : stepFor(counts[cISO] || 0);
              const bg = future ? 'transparent' : step ? tint(C.teal, step) : 'rgba(255,255,255,.05)';
              return (
                <div
                  key={cISO}
                  className={`heatcell${cISO === tISO ? ' today' : ''}`}
                  style={{ background: bg }}
                  title={`${cISO}${counts[cISO] ? ` · ${counts[cISO]}` : ''}`}
                />
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
        <span>{win.weeks} semanas</span>
      </div>
    </div>
  );
}
