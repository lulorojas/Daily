import { EmptyCard, Section } from '../ui/Section';
import { habitDayMarks, habitDayPossible, habitFirstISO } from '../../lib/habits';
import { progWeekWindow } from '../../lib/progress';
import { HEATMAP_STEPS, heatmapStep } from '../../lib/progressView';
import { DOW_MINI, addDays, iso, todayISO } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* ----------------------------- MAPA DE HÁBITOS -----------------------------
   Port de progHeatmap(). Una grilla de 7 filas (los días de la semana) por N columnas
   (las semanas de la ventana), pintada más o menos intenso según cuánto se cumplió ese
   día. Los días futuros quedan transparentes: no hay nada que mostrar todavía, y no es lo
   mismo que "no se cumplió nada" (que sí se pinta, apenas). */
export function ProgHeatmap({ data, per }) {
  return (
    <Section label="Mapa de hábitos">
      {data.habits.length === 0 ? (
        <EmptyCard size="tight">Todavía no creaste hábitos.</EmptyCard>
      ) : (
        <HeatmapCard data={data} per={per} />
      )}
    </Section>
  );
}

function HeatmapCard({ data, per }) {
  const win = progWeekWindow(per, [habitFirstISO(data)]);
  const tISO = todayISO();
  const poss = habitDayPossible(data);

  return (
    <div className="card heatmapcard">
      {Array.from({ length: 7 }, (_, d) => (
        <div className="heatrow" key={d}>
          <span className="heatrow-dow">{DOW_MINI[d]}</span>
          <div className="heatrow-cells" style={{ gridTemplateColumns: `repeat(${win.weeks},minmax(0,1fr))` }}>
            {Array.from({ length: win.weeks }, (_, w) => {
              const cISO = iso(addDays(win.from, w * 7 + d));
              const future = cISO > tISO;
              const frac = !future && poss ? habitDayMarks(data, cISO) / poss : 0;
              const step = heatmapStep(frac);
              const bg = future ? 'transparent' : step ? tint(C.green, step) : 'rgba(255,255,255,.05)';
              return (
                <div
                  key={cISO}
                  className={`heatcell${cISO === tISO ? ' today' : ''}`}
                  style={{ background: bg }}
                  title={cISO}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div className="heatlegend">
        <span>menos</span>
        {HEATMAP_STEPS.map((step) => <span key={step} className="heatlegend-dot" style={{ background: tint(C.green, step) }} />)}
        <span>más</span>
        <span className="grow" />
        <span>{win.weeks} semanas</span>
      </div>
    </div>
  );
}
