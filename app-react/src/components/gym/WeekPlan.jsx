import { ChevronLeftIcon, ChevronRightIcon, ChipChevronIcon, CrossIcon, HabitCheckIcon, PencilIcon, PlusIcon } from '../ui/Icons';
import { DOW_SHORT, dow, todayD } from '../../lib/dates';
import { REST, allTypes, dayTurnos, typeColor } from '../../lib/gym';
import { tint } from '../../lib/theme';

/* ----------------------------- PLAN SEMANAL -----------------------------
   Port del primer bloque de viewGym(). Siete filas, una por día: la sigla, una barra del
   color del tipo, el chip que despliega el selector y el check de "hecho".

   Entrenamientos dobles (etapa 6, sin precedente en vanilla — es campo nuevo del modelo):
   cada día dibuja 1 o 2 turnos según dayTurnos(). El segundo turno se agrega/quita con un
   control propio; no hay boceto de vanilla que copiar acá, así que se armó con las mismas
   piezas que ya existen (gchip/gcheck/optchips) para que un turno nuevo no desentone.

   Cuál chip está desplegado ahora es `{ day, slot }` en vez de un índice solo — antes
   alcanzaba con "qué día" porque había un solo chip por día; con dos turnos hace falta
   saber además cuál de los dos.

   Ojo con una diferencia deliberada de la etapa 2: en la app vanilla, getWeekPlan() creaba
   la semana en el documento con solo MIRARLA, y esa semana vacía se guardaba en el próximo
   guardado. Acá leer es leer: weekPlanFor() devuelve la semana sin tocar nada, y recién se
   escribe cuando de verdad cambiás algo. Vanilla recrea al vuelo las semanas que falten,
   así que ninguna de las dos versiones pierde datos. */
export function WeekPlan({ data, plan, weekLabel, isCurrentWeek, expandido, onExpandir, onSemana, onTipo, onHecho, onAddTurno, onRemoveTurno, onAdministrar }) {
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
          const turnos = dayTurnos(d);

          return (
            <div className="planday" key={i}>
              {turnos.map((t) => {
                const rest = t.type === REST;
                const col = typeColor(data, t.type);
                const abierto = !!expandido && expandido.day === i && expandido.slot === t.slot;

                return (
                  <div className="gday" key={t.slot}>
                    {/* La sigla del día solo va en el primer turno: repetirla en el
                        segundo no suma nada y desalinea la fila con la de arriba. */}
                    <span className={`gtag${isCurrentWeek && hoyIdx === i && t.slot === 1 ? ' today' : ''}`}>
                      {t.slot === 1 ? DOW_SHORT[i] : ''}
                    </span>
                    <div className={`gbar${rest ? ' rest' : ''}`} style={rest ? undefined : { background: col }} />

                    <button
                      type="button"
                      className={`gchip${rest ? ' rest' : ''}`}
                      style={rest ? undefined : { background: tint(col, '24'), color: col }}
                      aria-label={`${DOW_SHORT[i]}${t.slot === 2 ? ' (2do turno)' : ''}: ${t.type}, cambiar tipo`}
                      aria-expanded={abierto}
                      onClick={() => onExpandir(abierto ? null : { day: i, slot: t.slot })}
                    >
                      {t.type}{' '}
                      <ChipChevronIcon open={abierto} />
                    </button>

                    <div className="spacer" />

                    <button
                      type="button"
                      className={`gcheck${t.done ? ' on' : ''}`}
                      style={t.done ? { background: col, borderColor: col } : undefined}
                      role="checkbox"
                      aria-checked={t.done}
                      aria-label={`${DOW_SHORT[i]}${t.slot === 2 ? ' (2do turno)' : ''}: ${t.type}`}
                      onClick={() => onHecho(i, t.slot)}
                    >
                      <HabitCheckIcon />
                    </button>

                    {t.slot === 2 && (
                      <button
                        type="button"
                        className="turno-quitar"
                        aria-label={`Quitar el segundo turno de ${DOW_SHORT[i]}`}
                        onClick={() => onRemoveTurno(i)}
                      >
                        <CrossIcon size={10} strokeWidth="2.6" />
                      </button>
                    )}
                  </div>
                );
              })}

              {expandido && expandido.day === i && (
                <div className="optchips">
                  {allTypes(data).map((opt) => {
                    const turnoActivo = turnos.find((t) => t.slot === expandido.slot);
                    const activo = opt.name === turnoActivo?.type;
                    return (
                      <button
                        type="button"
                        key={opt.name}
                        className={`optchip${activo ? ' on' : ''}`}
                        style={{
                          color: activo ? '#0A0C11' : opt.color,
                          background: activo ? opt.color : tint(opt.color, '20'),
                          border: `1.5px solid ${activo ? 'transparent' : tint(opt.color, '55')}`,
                        }}
                        aria-pressed={activo}
                        onClick={() => onTipo(i, expandido.slot, opt.name)}
                      >
                        {opt.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {turnos.length === 1 && (
                <button type="button" className="turno-agregar" onClick={() => onAddTurno(i)}>
                  <PlusIcon size={11} strokeWidth="2.4" />
                  2do turno
                </button>
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
