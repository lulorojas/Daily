import { useState } from 'react';
import { CheckSquareOffset } from '@phosphor-icons/react';
import { activePlan, mealScoreByPeriod } from '../../lib/meals';
import { C } from '../../lib/theme';

/* ----------------------------- ¿COMISTE BIEN? -----------------------------
   Pedido explícito: "un gráfico que según lapsos de tiempo [diga] cuántas comidas estuve
   bien y cuántas le pifié". Una barra por columna del período elegido arriba (días en
   Semana, semanas en Mes, meses en 3 y 6 meses y Año, trimestres en Todo — el mismo recorte
   que "Cómo venís"), apilada en tres tramos: bien (verde), le pifiaste (rojo) y sin
   registrar (punteado, más tenue: no anotar no es lo mismo que comer mal). Toda la cuenta
   vive en mealScoreByPeriod() (lib/meals.js).

   Rediseño Nocturne: el porcentaje de comidas bien va grande arriba, y la cantidad de cada
   tramo ya no se lee de una leyenda sino TOCANDO el tramo: aparece un globito con el número
   y el nombre. `tip` guarda cuál está abierto, como { barra, tramo }; tocar el mismo lo
   cierra. Cada tramo es un botón (accesible por teclado), no un div con onClick. */
const TRAMOS = [
  { key: 'sinRegistrar', label: 'sin registrar', legend: 'Sin registrar', color: 'rgba(233,233,237,.4)' },
  { key: 'pifie', label: 'le pifiaste', legend: 'Le pifiaste', color: C.danger },
  { key: 'bien', label: 'bien', legend: 'Bien', color: C.green },
];

export function ProgMealScore({ data, per, className = '' }) {
  const [tip, setTip] = useState(null);
  const sinPlan = !activePlan(data)?.slots.length;
  const s = mealScoreByPeriod(data, per);
  const max = Math.max(1, ...s.bars.map((b) => b.bien + b.pifie + b.sinRegistrar));
  const hayAlgo = s.total.bien + s.total.pifie + s.total.sinRegistrar > 0;

  return (
    <section className={`card progcard score ${className}`}>
      <div className="listcard-head">
        <CheckSquareOffset size={16} color="var(--green)" aria-hidden="true" />
        <h2 className="listcard-title">¿Comiste bien?</h2>
        <span className="progcard-win">{s.winLabel}</span>
      </div>

      {sinPlan ? (
        <div className="empty">Armá tu plan de comidas (sección Comidas) para ver cómo te va.</div>
      ) : !hayAlgo ? (
        <div className="empty">Todavía no registraste comidas en este período.</div>
      ) : (
        <>
          {s.pctBien !== null && (
            <div className="score-big">
              <span className="score-pct">{Math.round(s.pctBien * 100)}%</span>
              <span className="score-msg">de las {s.total.bien + s.total.pifie} comidas que registraste estuvieron bien.</span>
            </div>
          )}

          <div className="score-bars">
            {s.bars.map((b, bi) => {
              const total = b.bien + b.pifie + b.sinRegistrar;
              return (
                <div className="score-col" key={b.from}>
                  <div
                    className="score-bar"
                    style={{ height: `${Math.max(6, (total / max) * 100)}%` }}
                    aria-label={`${b.label}: ${b.bien} bien, ${b.pifie} le pifiaste, ${b.sinRegistrar} sin registrar`}
                  >
                    {TRAMOS.filter((t) => b[t.key] > 0).map((t) => {
                      const abierto = tip && tip.bi === bi && tip.key === t.key;
                      return (
                        <button
                          type="button" key={t.key} className={`score-seg ${t.key}${abierto ? ' on' : ''}`} style={{ flex: b[t.key] }}
                          aria-label={`${b.label}: ${b[t.key]} ${t.label}`}
                          onClick={() => setTip(abierto ? null : { bi, key: t.key })}
                        >
                          {abierto && (
                            <span className="score-tip" style={{ borderColor: t.color, boxShadow: `0 8px 20px rgba(0,0,0,.5), 0 0 14px ${t.color}` }}>
                              <b style={{ color: t.color }}>{b[t.key]}</b> {t.label}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <span className={`score-lbl${b.current ? ' now' : ''}`}>{b.label}</span>
                </div>
              );
            })}
          </div>

          <div className="score-legend">
            <span><span style={{ background: C.green }} />Bien {s.total.bien}</span>
            <span><span style={{ background: C.danger }} />Le pifiaste {s.total.pifie}</span>
            <span><span className="dashed" />Sin registrar {s.total.sinRegistrar}</span>
          </div>
        </>
      )}
    </section>
  );
}
