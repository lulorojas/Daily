import { Donut } from '../ui/Donut';
import { EmptyCard, Section } from '../ui/Section';
import { gymHistory, gymRanking, typeColor } from '../../lib/gym';
import { inPeriod, progPeriodNote } from '../../lib/progress';

/* ----------------------------- BALANCE MUSCULAR -----------------------------
   Port de progBalance(). La dona de progRanking() vista como proporción en vez de barras:
   mismos datos (gymRanking sobre el historial del período), otra forma de leerlos. */
export function ProgBalance({ data, per, start }) {
  const hist = gymHistory(data).filter((x) => inPeriod(x.date, start));
  const ranked = gymRanking(hist);

  return (
    <Section label="Balance muscular">
      {ranked.length === 0 ? (
        <EmptyCard size="tight">No marcaste entrenamientos {progPeriodNote(per)}.</EmptyCard>
      ) : (
        <BalanceCard data={data} hist={hist} ranked={ranked} />
      )}
    </Section>
  );
}

function BalanceCard({ data, hist, ranked }) {
  const total = hist.length;
  const slices = ranked.map((r) => ({ value: r.count, color: typeColor(data, r.type) }));

  return (
    <div className="card balancecard">
      <div className="balance-donut">
        <Donut slices={slices} size={124} thick={14} />
        <div className="balance-donut-center">
          <span className="fr balance-total">{total}</span>
          <span className="balance-total-lbl">{total === 1 ? 'sesión' : 'sesiones'}</span>
        </div>
      </div>
      <div className="grow balance-legend">
        {ranked.map((r) => {
          const col = typeColor(data, r.type);
          const pct = Math.round((r.count / total) * 100);
          return (
            <div className="balance-legend-row" key={r.type}>
              <span className="balance-dot" style={{ background: col }} />
              <span className="grow balance-legend-name">{r.type}</span>
              <span className="balance-legend-pct">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
