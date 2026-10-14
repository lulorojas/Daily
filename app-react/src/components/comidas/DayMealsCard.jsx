import { breakdownLabel, optionLabel } from '../../lib/meals';
import { C } from '../../lib/theme';

/* ----------------------------- TU DÍA -----------------------------
   Lo primero de Comidas (pedido explícito: "que yo pueda llevar de una manera fácil, clara
   y didáctica el registro de mis comidas"). Arriba, una frase y un número que se
   entienden solos ("Te falta: Cena." · 75% del plan); abajo, una fila por franja del
   plan con su estado, lo que se registró y el botón para registrar.

   El estado de cada franja (Pendiente/Parcial/Cumplida/Poco) y la frase salen de
   dayMealSummary() en lib/meals.js — acá solo se dibuja. */
function itemColor(it) {
  if (it.got >= it.expected) return C.green;
  if (it.got > 0) return C.amber;
  return 'rgba(242,244,248,.35)';
}

export function DayMealsCard({ summary, onRegistrar }) {
  const pct = summary.pct === null ? null : Math.round(summary.pct * 100);

  return (
    <div className="card daymeals">
      <div className="daymeals-head">
        <div className="grow">
          <div className="daymeals-msg">{summary.message}</div>
          <div className="daymeals-sub">
            {summary.hechas} de {summary.franjas.length} comidas registradas
            {summary.fueraDePlan > 0 && ` · ${summary.fueraDePlan} fuera del plan`}
          </div>
        </div>
        {pct !== null && (
          <div className="daymeals-pct" style={{ color: pct >= 90 ? C.green : pct >= 50 ? C.amber : 'rgba(242,244,248,.6)' }}>
            <span className="fr">{pct}%</span>
            <span className="daymeals-pctlbl">del plan</span>
          </div>
        )}
      </div>

      {summary.franjas.map((f) => (
        <div className="daymeals-row" key={f.slot.id}>
          <div className="daymeals-rowtop">
            <span className="daymeals-name">{f.slot.name}</span>
            <span className="mono daymeals-status" style={{ color: f.status.color }}>{f.status.label}</span>
            <span className="grow" />
            <button type="button" className="pillbtn comidas" onClick={() => onRegistrar(f.slot)} aria-label={`Registrar ${f.slot.name}`}>
              Registrar
            </button>
          </div>

          {f.registros.map((r) => (
            <div className="daymeals-reg" key={`${r.entryId}-${r.option.id}`}>
              <div className="daymeals-opt">
                {optionLabel(r.option)}
                {r.pesado && <span className="daymeals-pesado">pesado</span>}
              </div>
              {r.detalle && (
                <div className="daymeals-items">
                  {r.detalle.map((it) => (
                    <span className="mono" key={it.id} style={{ color: itemColor(it) }}>{breakdownLabel(it)}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
