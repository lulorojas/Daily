import { EmptyCard, Section } from '../ui/Section';
import { activePlan, mealScoreByPeriod } from '../../lib/meals';
import { C } from '../../lib/theme';

/* ----------------------------- ¿COMISTE BIEN? -----------------------------
   Pedido explícito: "un gráfico que según lapsos de tiempo [diga] cuántas comidas estuve
   bien y cuántas le pifié". Una barra por columna del período elegido arriba (días en
   Semana, semanas en Mes, meses en Año, trimestres en Todo — el mismo recorte que "Cómo
   venís"), apilada en tres colores: bien, le pifiaste, y sin registrar (más tenue,
   porque no anotar no es lo mismo que comer mal). Toda la cuenta vive en
   mealScoreByPeriod() (lib/meals.js).

   Mismas barras CSS que Frecuencia semanal de Gimnasio (.freqbars/.freqseg): con pocas
   columnas no hace falta un SVG. */
const SIN_REGISTRAR = 'rgba(242,244,248,.16)';
const SEGMENTOS = [
  { key: 'bien', label: 'Bien', color: C.green },
  { key: 'pifie', label: 'Le pifiaste', color: C.danger },
  { key: 'sinRegistrar', label: 'Sin registrar', color: SIN_REGISTRAR },
];

export function ProgMealScore({ data, per }) {
  const sinPlan = !activePlan(data)?.slots.length;
  const s = mealScoreByPeriod(data, per);
  const max = Math.max(1, ...s.bars.map((b) => b.bien + b.pifie + b.sinRegistrar));
  const hayAlgo = s.total.bien + s.total.pifie + s.total.sinRegistrar > 0;

  return (
    <Section label="¿Comiste bien?" action={<span className="mono comovenis-win">{s.winLabel.toUpperCase()}</span>}>
      {sinPlan ? (
        <EmptyCard size="tight">Armá tu plan de comidas (sección Comidas) para ver cómo te va.</EmptyCard>
      ) : !hayAlgo ? (
        <EmptyCard size="tight">Todavía no registraste comidas en este período.</EmptyCard>
      ) : (
        <div className="bigcard">
          <div className="tiles">
            <div className="tile">
              <div className="mono tile-k">BIEN</div>
              <div className="v comovenis-statv" style={{ color: C.green }}>{s.total.bien}</div>
            </div>
            <div className="tile">
              <div className="mono tile-k">LE PIFIASTE</div>
              <div className="v comovenis-statv" style={{ color: C.danger }}>{s.total.pifie}</div>
            </div>
            <div className="tile">
              <div className="mono tile-k">SIN REGISTRAR</div>
              <div className="v comovenis-statv">{s.total.sinRegistrar}</div>
            </div>
          </div>

          {s.pctBien !== null && (
            <div className="mealscore-msg">
              De las {s.total.bien + s.total.pifie} comidas que registraste, {Math.round(s.pctBien * 100)}% estuvieron bien.
            </div>
          )}

          <div className="freqbars">
            {s.bars.map((b) => (
              <div className="freqcol" key={b.from}>
                <div
                  className="freqbar"
                  aria-label={`${b.label}: ${b.bien} bien, ${b.pifie} le pifiaste, ${b.sinRegistrar} sin registrar`}
                >
                  {SEGMENTOS.filter((g) => b[g.key] > 0).map((g) => (
                    <div
                      key={g.key}
                      className="freqseg"
                      style={{ height: `${(b[g.key] / max) * 100}%`, background: g.color }}
                    />
                  ))}
                </div>
                <span className={`mono freqlbl${b.current ? ' mealscore-now' : ''}`}>{b.label}</span>
              </div>
            ))}
          </div>

          <div className="mealscore-legend">
            {SEGMENTOS.map((g) => (
              <span key={g.key}><span className="cargas-dot" style={{ background: g.color }} />{g.label}</span>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
