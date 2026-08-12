import { EmptyCard, Section } from '../ui/Section';
import { gymHistory, gymWeekCounts } from '../../lib/gym';
import { inPeriod, progPeriodNote, progWeekWindow } from '../../lib/progress';
import { addDays, iso, shortDate } from '../../lib/dates';
import { C, tint } from '../../lib/theme';

/* ----------------------------- FRECUENCIA DE ENTRENAMIENTO -----------------------------
   Port de progFrecuencia(). Una barra por semana de la ventana (entre 8 y 26, ver
   progWeekWindow en lib/progress.js), con la altura proporcional a cuántas veces se
   entrenó esa semana. El color marca tres escalones: 5 o más sesiones va lleno, 3 o 4 a
   media intensidad, menos que eso apenas visible — no es una escala continua. */
export function ProgFrecuencia({ data, per, start }) {
  const hist = gymHistory(data);

  return (
    <Section label="Frecuencia de entrenamiento">
      {hist.length === 0 ? (
        <EmptyCard size="tight">Marcá entrenamientos para ver tu frecuencia.</EmptyCard>
      ) : (
        <FrecuenciaCard hist={hist} per={per} start={start} />
      )}
    </Section>
  );
}

function FrecuenciaCard({ hist, per, start }) {
  const win = progWeekWindow(per, [hist[hist.length - 1].date]);
  const counts = gymWeekCounts(hist.filter((x) => inPeriod(x.date, start)));
  const bars = Array.from({ length: win.weeks }, (_, i) => {
    const wk = iso(addDays(win.from, i * 7));
    return { wk, n: counts[wk] || 0 };
  });
  const max = Math.max(1, ...bars.map((b) => b.n));
  const total = bars.reduce((a, b) => a + b.n, 0);

  if (!total) return <EmptyCard size="tight">No marcaste entrenamientos {progPeriodNote(per)}.</EmptyCard>;

  const promedio = (total / win.weeks).toFixed(1).replace('.0', '');

  return (
    <div className="card barchartcard">
      <div className="barchart-headline">
        <span className="fr barchart-num">{promedio}</span>
        <span className="barchart-lbl">sesiones por semana</span>
      </div>
      <div className="progbars">
        {bars.map((b) => {
          const pct = b.n ? Math.max(9, Math.round((b.n / max) * 100)) : 0;
          const color = b.n >= 5 ? C.teal : b.n >= 3 ? tint(C.teal, '8C') : tint(C.teal, '40');
          return (
            <div className="progbar" key={b.wk} title={`${b.n} · ${shortDate(b.wk)}`}>
              <div className="pbfill" style={{ height: `${pct}%`, background: b.n ? color : 'transparent' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
