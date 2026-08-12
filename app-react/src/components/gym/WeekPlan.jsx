import { ChevronLeftIcon, ChevronRightIcon, ChipChevronIcon, HabitCheckIcon, PencilIcon } from '../ui/Icons';
import { DOW_SHORT, dow, todayD } from '../../lib/dates';
import { REST, allTypes, typeColor } from '../../lib/gym';
import { tint } from '../../lib/theme';

/* ----------------------------- PLAN SEMANAL -----------------------------
   Port del primer bloque de viewGym(). Siete filas, una por día: la sigla, una barra del
   color del tipo, el chip que despliega el selector y el check de "hecho".

   Cuál día está desplegado es estado de la pantalla (uno solo a la vez, como en vanilla:
   abrir uno cierra el anterior). No vive acá adentro porque el chip y el selector están en
   la misma fila pero son dos elementos distintos, y porque la pantalla necesita cerrarlo
   al cambiar de semana.

   Ojo con una diferencia deliberada de la etapa 2: en la app vanilla, getWeekPlan() creaba
   la semana en el documento con solo MIRARLA, y esa semana vacía se guardaba en el próximo
   guardado. Acá leer es leer: weekPlanFor() devuelve la semana sin tocar nada, y recién se
   escribe cuando de verdad cambiás algo. Vanilla recrea al vuelo las semanas que falten,
   así que ninguna de las dos versiones pierde datos. */
export function WeekPlan({ data, plan, weekLabel, isCurrentWeek, expandido, onExpandir, onSemana, onTipo, onHecho, onAdministrar }) {
  const hoyIdx = dow(todayD());

  return (
    <div className="sect">
      <div className="sectrow">
        <span className="sectlabel">Plan semanal</span>
        <div className="weekstrip weeknav">
          <button type="button" className="nb" onClick={() => onSemana(-1)} aria-label="Semana anterior">
            <ChevronLeftIcon />
          </button>
          <span className="weeklabel">{weekLabel}</span>
          <button type="button" className="nb" onClick={() => onSemana(1)} aria-label="Semana siguiente">
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="card plancard">
        {plan.map((d, i) => {
          const rest = d.type === REST;
          const col = typeColor(data, d.type);
          const abierto = expandido === i;

          return (
            <div className="planday" key={i}>
              <div className="gday">
                {/* La sigla del día se tiñe con el acento solo si es hoy, y solo cuando se
                    está mirando la semana en curso (eso lo decide la pantalla). */}
                <span className={`gtag${isCurrentWeek && hoyIdx === i ? ' today' : ''}`}>
                  {DOW_SHORT[i]}
                </span>
                <div className={`gbar${rest ? ' rest' : ''}`} style={rest ? undefined : { background: col }} />

                <button
                  type="button"
                  className={`gchip${rest ? ' rest' : ''}`}
                  style={rest ? undefined : { background: tint(col, '24'), color: col }}
                  /* Sin aria-label, el nombre accesible sería el texto del tipo ("Pecho"),
                     que se repite si dos días tienen el mismo tipo — ambiguo para
                     encontrarlo por rol+nombre. El día lo desambigua. */
                  aria-label={`${DOW_SHORT[i]}: ${d.type}, cambiar tipo`}
                  aria-expanded={abierto}
                  onClick={() => onExpandir(abierto ? null : i)}
                >
                  {d.type}{' '}
                  <ChipChevronIcon open={abierto} />
                </button>

                <div className="spacer" />

                <button
                  type="button"
                  className={`gcheck${d.done ? ' on' : ''}`}
                  style={d.done ? { background: col, borderColor: col } : undefined}
                  role="checkbox"
                  aria-checked={d.done}
                  aria-label={`${DOW_SHORT[i]}: ${d.type}`}
                  onClick={() => onHecho(i)}
                >
                  <HabitCheckIcon />
                </button>
              </div>

              {abierto && (
                <div className="optchips">
                  {allTypes(data).map((t) => {
                    const activo = t.name === d.type;
                    return (
                      <button
                        type="button"
                        key={t.name}
                        className={`optchip${activo ? ' on' : ''}`}
                        style={{
                          color: activo ? '#0A0C11' : t.color,
                          background: activo ? t.color : tint(t.color, '20'),
                          border: `1.5px solid ${activo ? 'transparent' : tint(t.color, '55')}`,
                        }}
                        aria-pressed={activo}
                        onClick={() => onTipo(i, t.name)}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" className="dashed managetypes" onClick={onAdministrar}>
        <PencilIcon size={16} />
        Administrar tipos
      </button>
    </div>
  );
}
