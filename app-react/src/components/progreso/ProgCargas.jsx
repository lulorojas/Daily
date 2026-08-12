import { EmptyCard, Section } from '../ui/Section';
import { liftGains } from '../../lib/gym';
import { progPeriodNote } from '../../lib/progress';
import { fmtNum } from '../../lib/dates';
import { C } from '../../lib/theme';

/* ----------------------------- PROGRESO DE CARGA -----------------------------
   Port de progCargas(). El ejercicio con mayor avance del período, destacado, y hasta
   tres más como lista chica abajo. Dos estados vacíos DISTINTOS a propósito: "no tenés
   ejercicios" (nunca cargaste nada en Gimnasio) no es lo mismo que "no hay con qué
   comparar en este recorte" (tenés ejercicios, pero ninguno con dos registros en la
   ventana elegida) — son dos causas distintas y ameritan dos explicaciones distintas. */
export function ProgCargas({ data, per, start }) {
  const gains = liftGains(data, start);

  return (
    <Section label="Progreso de carga">
      {data.gym.lifts.length === 0 ? (
        <EmptyCard size="tight">Agregá ejercicios en Gimnasio para seguir tus cargas.</EmptyCard>
      ) : gains.length === 0 ? (
        <EmptyCard size="tight">Necesitás al menos dos registros de un ejercicio {progPeriodNote(per)} para comparar.</EmptyCard>
      ) : (
        <CargasCard gains={gains} />
      )}
    </Section>
  );
}

function CargasCard({ gains }) {
  const top = gains[0];
  const resto = gains.slice(1, 4);
  const signo = (n) => (n >= 0 ? '+' : '') + fmtNum(n);

  return (
    <div className="agcard cargascard">
      <div className="cargas-top">
        <div className="cargas-top-name">
          <span className="cargas-name">{top.name}</span>
          <span className="cargas-sub">Mejor progreso del período</span>
        </div>
        <div className="cargas-top-val">
          <span className="fr cargas-cur">{fmtNum(top.to)} {top.unit}</span>
          <span className="cargas-gain" style={{ color: top.gain < 0 ? C.danger : C.green }}>{signo(top.gain)} {top.unit}</span>
        </div>
      </div>

      {resto.length > 0 && (
        <div className="cargas-resto">
          {resto.map((g) => (
            <div className="cargas-restrow" key={g.id}>
              <span className="cargas-dot" style={{ background: g.color }} />
              <span className="grow cargas-restname">{g.name}</span>
              <span className="cargas-restgain" style={{ color: g.gain < 0 ? C.danger : g.gain > 0 ? C.green : 'rgba(242,244,248,.4)' }}>
                {signo(g.gain)} {g.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
