import { Coffee } from '@phosphor-icons/react';
import { cafePorPeriodo } from '../../lib/meals';

/* ----------------------------- CAFÉ -----------------------------
   La "mini marquita" de cuánto café se viene tomando (pedido explícito): las tazas del
   período elegido (la misma ventana que el resto de Progreso), el promedio por día sin
   decimales, y una barrita por columna para ver si va subiendo o bajando. Los datos salen
   del contador de la pantalla Comidas (ver cafePorPeriodo en lib/meals.js). */
export function ProgCafe({ data, per, className = '' }) {
  const c = cafePorPeriodo(data, per);
  const max = Math.max(1, ...c.bars.map((b) => b.n));

  return (
    <section className={`card progcard cafe ${className}`}>
      <div className="listcard-head">
        <Coffee size={16} color="var(--amber)" aria-hidden="true" />
        <h2 className="listcard-title">Café</h2>
        <span className="progcard-win">{c.winLabel}</span>
      </div>

      {!c.existe || c.total === 0 ? (
        <div className="empty">Todavía no anotaste café en este período. Se cuenta desde Comidas, en Extras.</div>
      ) : (
        <>
          <div className="cafe-big">
            <span className="cafe-n">{c.total}</span>
            <span className="cafe-u">{c.total === 1 ? 'taza' : 'tazas'}</span>
          </div>
          <div className="cafe-sub">
            {c.diasConCafe} {c.diasConCafe === 1 ? 'día' : 'días'} con café · prom. {c.promedioPorDia}/día
          </div>
          <div className="cafe-bars">
            {c.bars.map((b, i) => (
              <div className="cafe-col" key={i} title={`${b.label}: ${b.n}`}>
                <span className="cafe-bar" style={{ height: `${b.futuro ? 0 : Math.max(b.n ? 12 : 4, (b.n / max) * 100)}%` }} aria-label={`${b.label}: ${b.n} ${b.n === 1 ? 'taza' : 'tazas'}`} />
                <span className={`cafe-lbl${b.current ? ' now' : ''}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
