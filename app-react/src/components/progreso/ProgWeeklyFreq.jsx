import { EmptyCard, Section } from '../ui/Section';
import { comoVenis } from '../../lib/progress';

/* ----------------------------- FRECUENCIA SEMANAL -----------------------------
   Nueva, pedido explícito ("quiero una tabla de frecuencia semanal de cada cosa, es
   decir, la cantidad de veces por semana") y SEPARADA de "Cómo venís" (confirmado con
   Lulo) — esa otra sección ya dice cómo viene cada músculo por período, esta dice nomás
   cuántas veces por semana en promedio, una lista simple en vez de una matriz.

   Misma ventana que "Cómo venís" (mismo per, mismo gymHistory recortado) — pedido
   explícito de que todos los gráficos midan lo mismo. `rate` ya sale calculado de
   comoVenis() (lib/progress.js): total de la ventana / semanas que abarca esa ventana,
   sin importar la unidad de columna (día/semana/mes/trimestre) que use cada período. */
export function ProgWeeklyFreq({ data, per }) {
  const v = comoVenis(data, per);
  const filas = v.rows.filter((r) => r.total > 0).sort((a, b) => b.rate - a.rate);

  return (
    <Section label="Frecuencia semanal" action={<span className="mono comovenis-win">{v.winLabel.toUpperCase()}</span>}>
      {filas.length === 0 ? (
        <EmptyCard size="tight">Todavía no hay entrenos en este período.</EmptyCard>
      ) : (
        <div className="card cargas-resto">
          {filas.map((r) => (
            <div className="cargas-restrow" key={r.name}>
              <span className="cargas-dot" style={{ background: r.color }} />
              <span className="cargas-restname">{r.name}</span>
              <span className="mono cargas-restgain" style={{ color: r.color }}>{r.rate.toFixed(1).replace('.', ',')}/sem</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
