import { EmptyCard, Section } from '../ui/Section';
import { bucketPct, progHabitBuckets } from '../../lib/progress';
import { bucketUnit } from '../../lib/progressView';
import { C } from '../../lib/theme';

/* ----------------------------- CUMPLIMIENTO DE HÁBITOS -----------------------------
   Port de progCumplimiento(). Un balde por barra —un día en semana/mes, una semana en
   año, un mes en todo (progHabitBuckets, etapa 2)— con el % de marcas hechas sobre las
   posibles. `conDatos` filtra los baldes SIN hábitos todavía en esa fecha (bucketPct
   devuelve null): el promedio se calcula solo sobre lo que sí tiene con qué comparar. */
export function ProgCumplimiento({ data, per }) {
  return (
    <Section label="Cumplimiento de hábitos">
      {data.habits.length === 0 ? (
        <EmptyCard size="tight">Todavía no creaste hábitos.</EmptyCard>
      ) : (
        <CumplimientoCard data={data} per={per} />
      )}
    </Section>
  );
}

function CumplimientoCard({ data, per }) {
  const buckets = progHabitBuckets(data, per).map((b) => ({ ...b, pct: bucketPct(data, b.days) }));
  const conDatos = buckets.filter((b) => b.pct != null);

  if (!conDatos.length) return <EmptyCard size="tight">Marcá hábitos para ver tu cumplimiento.</EmptyCard>;

  const promedio = Math.round((conDatos.reduce((a, b) => a + b.pct, 0) / conDatos.length) * 100);

  return (
    <div className="card barchartcard">
      <div className="barchart-headline">
        <span className="fr barchart-num" style={{ color: C.green }}>{promedio}%</span>
        <span className="barchart-lbl">promedio · {bucketUnit(per)}</span>
      </div>
      <div className="progbars">
        {buckets.map((b, i) => {
          const p = b.pct == null ? 0 : Math.round(b.pct * 100);
          return (
            <div className="progbar" key={i} title={`${b.label}: ${p}%`}>
              <div className="pbfill" style={{ height: `${p ? Math.max(6, p) : 0}%`, background: p ? C.green : 'transparent' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
